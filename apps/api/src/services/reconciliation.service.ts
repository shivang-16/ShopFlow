import prisma from "../../prisma/prisma";
import { k8sService } from "./k8s.service";
import { logger } from "../logger";

export class ReconciliationService {
  /**
   * Scans for stores that are stuck in 'PROVISIONING' state and updates their status
   * based on the actual Kubernetes deployment state.
   */
  async reconcileProvisioningStores() {
    logger.info("[RECONCILER] Starting reconciliation for stuck PROVISIONING stores...");

    try {
      // Find all stores that are currently marked as PROVISIONING
      const provisioningStores = await prisma.store.findMany({
        where: { status: "PROVISIONING" },
      });

      if (provisioningStores.length === 0) {
        logger.info("[RECONCILER] No stores in PROVISIONING state found.");
        return;
      }

      logger.info(`[RECONCILER] Found ${provisioningStores.length} stores to check.`);

      for (const store of provisioningStores) {
        await this.checkAndUpdateStore(store);
      }
    } catch (error) {
      logger.error("[RECONCILER] Critical error during reconciliation:", error);
    }
  }

  private async checkAndUpdateStore(store: any) {
    const namespace = `store-${store.id}`;
    logger.info(`[RECONCILER] Checking store ${store.id} (${store.name}) in namespace ${namespace}`);

    try {
      // 1. Check if the namespace exists
      try {
        await k8sService.verifyNamespaceResources(namespace);
      } catch (err) {
        logger.warn(`[RECONCILER] Namespace ${namespace} not found. Marking store as FAILED.`);
        await this.markStoreFailed(store.id, "System recovery: Namespace not found after restart");
        return;
      }

      // 2. Get current status from K8s
      const status = await k8sService.getStoreStatus(namespace);

      if (status.status === "READY") {
        logger.info(`[RECONCILER] Store ${store.id} is actually READY. Updating DB.`);
        
        // Recover the URL/NodePort if missing
        let storeUrl = store.subdomain;
        if (store.type === "MEDUSA" && (!storeUrl || !storeUrl.includes(":"))) {
           try {
             const nodePort = await k8sService.getNodePort(namespace, store.name);
             const publicIP = process.env.PUBLIC_IP || "43.205.194.216"; // Fallback IP
             storeUrl = `http://${publicIP}:${nodePort}/app/login`;
           } catch (e) {
             logger.warn(`[RECONCILER] Could not recover NodePort for ${store.id}`);
           }
        }

        await prisma.store.update({
          where: { id: store.id },
          data: { 
            status: "READY",
            subdomain: storeUrl
          },
        });
      } else if (status.status === "FAILED") {
        logger.warn(`[RECONCILER] Store ${store.id} is FAILED in K8s. Updating DB.`);
        await this.markStoreFailed(store.id, `System recovery: ${status.message}`);
      } else {
        // Still PROVISIONING or Unknown
        // Check if it's been provisioning for too long (e.g., > 20 mins)
        const provisioningTime = Date.now() - new Date(store.createdAt).getTime();
        const MAX_PROVISION_TIME = 20 * 60 * 1000; // 20 mins

        if (provisioningTime > MAX_PROVISION_TIME) {
           logger.warn(`[RECONCILER] Store ${store.id} timed out (${Math.round(provisioningTime/60000)}m). Marking FAILED.`);
           await this.markStoreFailed(store.id, "System recovery: Provisioning timed out");
        } else {
           logger.info(`[RECONCILER] Store ${store.id} is still provisioning (${Math.round(provisioningTime/60000)}m). Keeping status.`);
        }
      }

    } catch (error) {
      logger.error(`[RECONCILER] Failed to reconcile store ${store.id}:`, error);
    }
  }

  private async markStoreFailed(storeId: string, reason: string) {
    await prisma.store.update({
      where: { id: storeId },
      data: { 
        status: "FAILED", 
        errorMessage: reason.substring(0, 500) 
      },
    });
  }
}

export const reconciliationService = new ReconciliationService();
