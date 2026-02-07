import { Request, Response } from "express";
import prisma from "../../prisma/prisma";
import { k8sService } from "../services/k8s.service";
import { auditService } from "../services/audit.service";
import { logger } from "../logger";

const MAX_STORES_PER_USER = 5;
const PROVISIONING_TIMEOUT = 600000;

function validateStoreName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length < 3) {
    return { valid: false, error: "Store name must be at least 3 characters" };
  }
  if (name.length > 50) {
    return { valid: false, error: "Store name must be less than 50 characters" };
  }
  // Must start with a letter and only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: "Store name must start with a letter and can only contain lowercase letters, numbers, and hyphens" };
  }
  return { valid: true };
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

  if (!["WOOCOMMERCE", "MEDUSA"].includes(type)) {
    logger.warn(`Store creation failed: Invalid store type "${type}"`);
    return res.status(400).json({ error: "Invalid store type. Must be WOOCOMMERCE or MEDUSA" });
  }

  try {
    const userStoreCount = await prisma.store.count({
      where: { userId, status: { not: "FAILED" } },
    });
    const baseDomain = process.env.BASE_DOMAIN || "local.test";
    const ingressPort = process.env.INGRESS_HTTP_PORT || "";
    const subdomain = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + `.${baseDomain}`;
    const fullUrl = ingressPort ? `http://${subdomain}:${ingressPort}` : `http://${subdomain}`;

    const existingStore = await prisma.store.findUnique({
      where: { subdomain },
    });

    if (existingStore) {
      return res.status(409).json({ error: "A store with this name already exists" });
    }

    const dbPassword = k8sService.generateSecurePassword(20);
    const dbRootPassword = k8sService.generateSecurePassword(20);
    const dbUser = "wordpress";
    const dbName = "wordpress";

    const store = await prisma.store.create({
      data: {
        name,
        subdomain: fullUrl,
        type,
        status: "PROVISIONING",
        userId,
        dbName,
        dbUser,
        dbPassword,
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
            store.name,
            namespace,
            name.toLowerCase().replace(/[^a-z0-9]/g, "-") + `.${process.env.BASE_DOMAIN || "local.test"}`,
            dbPassword,
            dbRootPassword
          );
        } else if (type === "MEDUSA") {
          await k8sService.installMedusa(
            store.name,
            namespace,
            name.toLowerCase().replace(/[^a-z0-9]/g, "-") + `.${process.env.BASE_DOMAIN || "local.test"}`,
            dbPassword
          );
        } else {
          throw new Error(`Unsupported store type: ${type}`);
        }

        let attempts = 0;
        const maxAttempts = 60;
        let storeReady = false;

        while (attempts < maxAttempts && !storeReady) {
          const status = await k8sService.getStoreStatus(namespace);

          if (status.status === "READY") {
            storeReady = true;
            break;
          } else if (status.status === "FAILED") {
            throw new Error(`Store provisioning failed: ${status.message}`);
          }

          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;

          if (Date.now() - startTime > PROVISIONING_TIMEOUT) {
            throw new Error("Provisioning timeout exceeded");
          }
        }

        if (!storeReady) {
          throw new Error("Store did not become ready in time");
        }

        const nodePort = await k8sService.getStoreNodePort(store.name, namespace);
        const publicIP = process.env.PUBLIC_IP || "localhost";
        const storeUrl = nodePort ? `http://${publicIP}:${nodePort}` : fullUrl;

        await prisma.store.update({
          where: { id: store.id },
          data: { 
            status: "READY",
            subdomain: storeUrl 
          },
        });

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
        logger.error(`Failed to provision store ${store.id}`, err);
        await prisma.store.update({
          where: { id: store.id },
          data: { status: "FAILED" },
        });

        await auditService.log({
          action: "STORE_PROVISION_FAILED",
          entityId: store.id,
          entity: "Store",
          userId,
          metadata: {
            error: err instanceof Error ? err.message : String(err),
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

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const namespace = `store-${store.id}`;
    const k8sStatus = await k8sService.getStoreStatus(namespace);

    res.json({
      id: store.id,
      status: store.status,
      k8sStatus,
    });
  } catch (error) {
    logger.error("Get store status API error", error);
    res.status(500).json({ error: "Failed to get store status" });
  }
};

export const getStoreLogs = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { podName } = req.query;

  try {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const namespace = `store-${store.id}`;

    if (!podName) {
      return res.status(400).json({ error: "podName query parameter required" });
    }

    const logs = await k8sService.getPodLogs(namespace, podName as string);

    res.json({ logs });
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

    await k8sService.uninstallHelmRelease(store.name, namespace);

    await k8sService.deleteNamespace(namespace);

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
