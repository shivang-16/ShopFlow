import { Request, Response } from "express";
import prisma from "../../prisma/prisma";
import { k8sService } from "../services/k8s.service";
import { auditService } from "../services/audit.service";
import { logger } from "../logger";

const MAX_STORES_PER_USER = 10;
const PROVISIONING_TIMEOUT = 60000;

function sanitizeStoreName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function validateStoreName(name: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!name || name.trim().length < 3) {
    return { valid: false, error: "Store name must be at least 3 characters" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Store name must be less than 100 characters" };
  }
  
  const sanitized = sanitizeStoreName(name);
  
  if (!sanitized || sanitized.length < 3) {
    return { valid: false, error: "Store name must contain at least 3 valid characters (letters or numbers)" };
  }
  
  return { valid: true, sanitized };
}

export const createStore = async (req: Request, res: Response) => {
  const { name, type = "WOOCOMMERCE" } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    logger.warn("Store creation failed: Unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const validation = validateStoreName(name);
  if (!validation.valid) {
    logger.warn(`Store creation failed: ${validation.error} (name: "${name}")`);
    return res.status(400).json({ error: validation.error });
  }

  const sanitizedName = validation.sanitized!;

  if (!["WOOCOMMERCE", "MEDUSA"].includes(type)) {
    logger.warn(`Store creation failed: Invalid store type "${type}"`);
    return res.status(400).json({ error: "Invalid store type. Must be WOOCOMMERCE or MEDUSA" });
  }

  try {
    // Check per-user store quota
    const userStoreCount = await prisma.store.count({
      where: { userId, status: { not: "FAILED" } },
    });

    if (userStoreCount >= MAX_STORES_PER_USER) {
      logger.warn(`Store creation failed: User ${userId} exceeded quota (${userStoreCount}/${MAX_STORES_PER_USER})`);
      return res.status(429).json({ 
        error: "Store quota exceeded",
        message: `You can create a maximum of ${MAX_STORES_PER_USER} stores. Delete existing stores to create new ones.`,
        current: userStoreCount,
        max: MAX_STORES_PER_USER
      });
    }

    const subdomain = `${sanitizedName}.shivangyadav.com`;
    const fullUrl = `https://${subdomain}`;


    const existingStore = await prisma.store.findUnique({
      where: { subdomain },
    });

    if (existingStore) {
      return res.status(409).json({ error: "A store with this name already exists" });
    }

    const dbPassword = k8sService.generateSecurePassword(20);
    const dbRootPassword = k8sService.generateSecurePassword(20);
    const wpAdminPassword = k8sService.generateSecurePassword(16);
    const dbUser = type === "WOOCOMMERCE" ? "wordpress" : "medusa";
    const dbName = type === "WOOCOMMERCE" ? "wordpress" : "medusa";
    const adminEmail = type === "MEDUSA" ? "admin@medusa.local" : "admin";

    const store = await prisma.store.create({
      data: {
        name: sanitizedName,
        subdomain: fullUrl,
        type,
        status: "PROVISIONING",
        userId,
        dbName,
        dbUser,
        dbPassword,
        wpAdminPassword,
        adminEmail,
      },
    });

    await auditService.log({
      action: "STORE_CREATE_REQUESTED",
      entityId: store.id,
      entity: "Store",
      userId,
      metadata: { name, type, subdomain },
    });

    res.status(202).json(store);

    (async () => {
      const startTime = Date.now();
      try {
        const namespace = `store-${store.id}`;

        await k8sService.createNamespace(namespace);

        if (type === "WOOCOMMERCE") {
          await k8sService.installWooCommerce(
            sanitizedName,
            namespace,
            sanitizedName + `.shivangyadav.com`,
            dbPassword,
            dbRootPassword,
            wpAdminPassword,
            name
          );
        } else if (type === "MEDUSA") {
          await k8sService.installMedusa(
            sanitizedName,
            namespace,
            sanitizedName + `.shivangyadav.com`,
            dbPassword,
            wpAdminPassword,
            adminEmail
          );
          
          // Wait a bit for resources to be created
          logger.info(`[${store.id}] Waiting 5s for Kubernetes resources to be created...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Verify resources were created
          const resourceCheck = await k8sService.verifyNamespaceResources(namespace);
          logger.info(`[${store.id}] Resource check:`, resourceCheck);
        } else {
          throw new Error(`Unsupported store type: ${type}`);
        }

        let attempts = 0;
        const maxAttempts = 60;
        let storeReady = false;

        logger.info(`[${store.id}] Starting to monitor deployment status...`);

        while (attempts < maxAttempts && !storeReady) {
          attempts++;
          const status = await k8sService.getStoreStatus(namespace);

          logger.info(`[${store.id}] Attempt ${attempts}/${maxAttempts} - Status: ${status.status}, Message: ${status.message}`);

          if (status.status === "READY") {
            storeReady = true;
            logger.info(`[${store.id}] Deployment is READY! Getting NodePort...`);
            break;
          } else if (status.status === "FAILED") {
            throw new Error(`Store provisioning failed: ${status.message}`);
          }

          await new Promise((resolve) => setTimeout(resolve, 5000));

          if (Date.now() - startTime > PROVISIONING_TIMEOUT) {
            throw new Error("Provisioning timeout exceeded");
          }
        }

        if (!storeReady) {
          throw new Error("Store did not become ready in time");
        }

        let storeUrl: string;

        if (type === "MEDUSA") {
          try {
            const nodePort = await k8sService.getNodePort(namespace, sanitizedName);
            const publicIP = process.env.PUBLIC_IP || "43.205.194.216";
            storeUrl = `http://${publicIP}:${nodePort}/app/login`;
          } catch (err) {
            logger.error(`[${store.id}] Failed to get NodePort for Medusa store:`, err);
            // Fallback or throw?
            throw new Error("Failed to retrieve service port for Medusa store");
          }
        } else {
          storeUrl = `https://${sanitizedName}.shivangyadav.com`;
        }

        // Update WordPress site URL to use the subdomain
        if (type === "WOOCOMMERCE") {
          try {
            await k8sService.updateWordPressSiteUrl(
              namespace, 
              sanitizedName, 
              `https://${sanitizedName}.shivangyadav.com`
            );
            logger.info(`[${store.id}] WordPress URL updated to https://${sanitizedName}.shivangyadav.com`);
          } catch (urlUpdateError) {
            logger.warn(`[${store.id}] Failed to auto-update WordPress URL:`, urlUpdateError);
            // Don't fail the whole provisioning just because URL update failed
          }
        }


        await prisma.store.update({
          where: { id: store.id },
          data: { 
            status: "READY",
            subdomain: storeUrl 
          },
        });

        logger.info(`Store ${store.id} provisioned successfully - URL: ${storeUrl}`);

        await auditService.log({
          action: "STORE_PROVISIONED",
          entityId: store.id,
          entity: "Store",
          userId,
          metadata: {
            duration: Date.now() - startTime,
            namespace,
          },
        });

        logger.info(`Store ${store.id} provisioned successfully in ${Date.now() - startTime}ms`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to provision store ${store.id}:`, errorMessage);
        
        await prisma.store.update({
          where: { id: store.id },
          data: { 
            status: "FAILED",
            errorMessage: errorMessage.substring(0, 500)
          },
        });

        await auditService.log({
          action: "STORE_PROVISION_FAILED",
          entityId: store.id,
          entity: "Store",
          userId,
          metadata: {
            error: errorMessage,
            duration: Date.now() - startTime,
          },
        });
      }
    })();
  } catch (error) {
    logger.error("Create store API error", error);
    res.status(500).json({ error: "Failed to create store" });
  }
};

export const listStores = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const stores = await prisma.store.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(stores);
  } catch (error) {
    logger.error("List stores API error", error);
    res.status(500).json({ error: "Failed to list stores" });
  }
};

export const getStore = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const namespace = `store-${store.id}`;
    const k8sStatus = await k8sService.getStoreStatus(namespace);

    res.json({
      ...store,
      k8sStatus,
    });
  } catch (error) {
    logger.error("Get store API error", error);
    res.status(500).json({ error: "Failed to get store" });
  }
};

export const getStoreStatus = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  logger.info(`[STATUS CHECK START] Checking status for store ${id}`);

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      logger.warn(`[STATUS CHECK] Store ${id} not found`);
      return res.status(404).json({ error: "Store not found" });
    }

    logger.info(`[STATUS CHECK] Store ${id} found - Current DB status: ${store.status}, Type: ${store.type}`);

    const namespace = `store-${store.id}`;
    logger.info(`[STATUS CHECK] Checking K8s status for namespace: ${namespace}`);
    
    const k8sStatus = await k8sService.getStoreStatus(namespace);
    logger.info(`[STATUS CHECK] K8s status received: ${JSON.stringify(k8sStatus)}`);

    // Auto-update store status in DB if K8s says it's ready but DB says provisioning
    if (k8sStatus.status === "READY" && store.status === "PROVISIONING") {
      logger.info(`[STATUS CHECK] ⚠️  MISMATCH DETECTED! K8s=READY but DB=PROVISIONING. Updating DB...`);
      
      try {
        await prisma.store.update({
          where: { id },
          data: { status: "READY" }
        });
        logger.info(`[STATUS CHECK] ✅ Successfully updated store ${id} status to READY in database`);
      } catch (updateError) {
        logger.error(`[STATUS CHECK] ❌ Failed to update store ${id} status:`, updateError);
      }
    } else {
      logger.info(`[STATUS CHECK] No update needed - K8s: ${k8sStatus.status}, DB: ${store.status}`);
    }

    const finalStatus = k8sStatus.status === "READY" ? "READY" : store.status;
    logger.info(`[STATUS CHECK END] Returning status: ${finalStatus} for store ${id}`);

    res.json({
      id: store.id,
      status: finalStatus,
      k8sStatus,
    });
  } catch (error) {
    logger.error(`[STATUS CHECK ERROR] Error checking status for store ${id}:`, error);
    res.status(500).json({ error: "Failed to get store status" });
  }
};

export const getStoreLogs = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { podName, jobName, tailLines = 200 } = req.query;

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const namespace = `store-${store.id}`;

    if (jobName) {
      const logs = await k8sService.getJobLogs(namespace, String(jobName), Number(tailLines));
      return res.json({ 
        jobName: String(jobName),
        logs 
      });
    }

    if (podName) {
      const logs = await k8sService.getPodLogs(namespace, String(podName), Number(tailLines));
      return res.json({ 
        podName: String(podName),
        logs 
      });
    }

    const pods = await k8sService.getStorePods(namespace);
    const logsData: any = {
      pods,
      logs: {}
    };

    for (const pod of pods) {
      logsData.logs[pod.name] = await k8sService.getPodLogs(namespace, pod.name, Number(tailLines));
    }

    res.json(logsData);
  } catch (error) {
    logger.error("Get store logs API error", error);
    res.status(500).json({ error: "Failed to get store logs" });
  }
};

export const getStoreAuditLogs = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const logs = await auditService.getLogsForEntity(id);
    res.json(logs);
  } catch (error) {
    logger.error("Get store audit logs API error", error);
    res.status(500).json({ error: "Failed to get audit logs" });
  }
};

export const deleteStore = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    if (store.userId && store.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You don't own this store" });
    }

    const namespace = `store-${store.id}`;

    // Try to uninstall Helm release (ignore if not found)
    try {
      await k8sService.uninstallHelmRelease(store.name, namespace);
    } catch (error: any) {
      logger.warn(`Failed to uninstall Helm release ${store.name}:`, error.message);
      // Continue anyway
    }

    // Try to delete namespace (ignore if not found)
    try {
      await k8sService.deleteNamespace(namespace);
    } catch (error: any) {
      logger.warn(`Failed to delete namespace ${namespace}:`, error.message);
      // Continue anyway
    }

    // Always delete from database regardless of K8s cleanup
    await prisma.store.delete({ where: { id } });

    await auditService.log({
      action: "STORE_DELETED",
      entityId: id,
      entity: "Store",
      userId,
      metadata: { name: store.name, namespace },
    });

    res.json({ message: "Store deleted successfully" });
  } catch (error) {
    logger.error("Delete store API error", error);
    res.status(500).json({ error: "Failed to delete store" });
  }
};

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const totalStores = await prisma.store.count();
    const provisioningStores = await prisma.store.count({ where: { status: "PROVISIONING" } });
    const readyStores = await prisma.store.count({ where: { status: "READY" } });
    const failedStores = await prisma.store.count({ where: { status: "FAILED" } });

    const storesByType = await prisma.store.groupBy({
      by: ["type"],
      _count: true,
    });

    const recentStores = await prisma.store.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: { createdAt: true, updatedAt: true },
    });

    const provisioningTimes = recentStores
      .filter((s) => s.updatedAt.getTime() > s.createdAt.getTime())
      .map((s) => s.updatedAt.getTime() - s.createdAt.getTime());

    const avgProvisioningTime =
      provisioningTimes.length > 0
        ? provisioningTimes.reduce((a, b) => a + b, 0) / provisioningTimes.length
        : 0;

    res.json({
      total_stores: totalStores,
      stores_by_status: {
        provisioning: provisioningStores,
        ready: readyStores,
        failed: failedStores,
      },
      stores_by_type: storesByType.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>),
      avg_provisioning_time_ms: Math.round(avgProvisioningTime),
      failure_rate:
        totalStores > 0 ? ((failedStores / totalStores) * 100).toFixed(2) + "%" : "0%",
    });
  } catch (error) {
    logger.error("Get metrics API error", error);
    res.status(500).json({ error: "Failed to get metrics" });
  }
};
