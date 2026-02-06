import http from "http";
import app from "./app";
import prisma from "./prisma";
import { logger } from "./logger";

const PORT = 4001;

const server = http.createServer(app);

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to database", error);
    process.exit(1);
  }
};

startServer();
