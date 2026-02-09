import http from "http";
import app from "./app";
import prisma from "../prisma/prisma";
import { logger } from "./logger";

const PORT = 4001;

const server = http.createServer(app);

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
    
    server.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      // Start background reconciliation
      try {
        const { reconciliationService } = await import("./services/reconciliation.service");
        await reconciliationService.reconcileProvisioningStores();
      } catch (err) {
        logger.error("Failed to run reconciler:", err);
      }
    });
  } catch (error) {
    logger.error("Failed to connect to database", error);
    process.exit(1);
  }
};

startServer();
