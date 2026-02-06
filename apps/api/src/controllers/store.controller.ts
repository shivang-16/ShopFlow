import { Request, Response } from "express";
import prisma from "../prisma";
import { k8sService } from "../services/k8s.service";
import { logger } from "../logger";

export const createStore = async (req: Request, res: Response) => {
  const { name, type = "WOOCOMMERCE" } = req.body;
  const userId = "user_2sNq..."; // TODO: Get from Clerk auth context req.auth.userId

  if (!name) { 
      return res.status(400).json({ error: "Store name is required" }); 
  }

  // Generate a subdomain safely
  const subdomain = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".local.test";

  try {
    // 1. Create DB Record
    const store = await prisma.store.create({
      data: {
        name,
        subdomain,
        type,
        status: "PROVISIONING",
        userId,
      },
    });

    res.status(202).json(store); // Return immediately

    // 2. Async Provisioning
    (async () => {
      try {
        const namespace = `store-${store.id}`;
        
        await k8sService.createNamespace(namespace);
        await k8sService.installWooCommerce(store.name, namespace, subdomain);

        await prisma.store.update({
          where: { id: store.id },
          data: { status: "READY" },
        });
        logger.info(`Store ${store.id} provisioned successfully`);
      } catch (err) {
        logger.error(`Failed to provision store ${store.id}`, err);
        await prisma.store.update({
          where: { id: store.id },
          data: { status: "FAILED" },
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
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(stores);
  } catch (error) {
    logger.error("List stores API error", error);
    res.status(500).json({ error: "Failed to list stores" });
  }
};

export const deleteStore = async (req: Request, res: Response) => {
    const { id } = req.params;
  
    try {
      const store = await prisma.store.findUnique({ where: { id } });
      if (!store) {
          return res.status(404).json({ error: "Store not found" }); 
      }
  
      const namespace = `store-${store.id}`;
      await k8sService.deleteNamespace(namespace);
  
      await prisma.store.delete({ where: { id } });
  
      res.json({ message: "Store deleted successfully" });
    } catch (error) {
      logger.error("Delete store API error", error);
      res.status(500).json({ error: "Failed to delete store" });
    }
};
