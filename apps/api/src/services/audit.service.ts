import prisma from "../../prisma/prisma";
import { logger } from "../logger";

export interface AuditLogData {
  action: string;
  entityId: string;
  entity: string;
  userId: string;
  metadata?: Record<string, any>;
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entityId: data.entityId,
          entity: data.entity,
          userId: data.userId,
          metadata: data.metadata || {},
        },
      });
      logger.info(`Audit log created: ${data.action} on ${data.entity} ${data.entityId} by ${data.userId}`);
    } catch (error) {
      logger.error("Failed to create audit log:", error);
    }
  }

  async getLogsForEntity(entityId: string, limit: number = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: { entityId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      logger.error(`Failed to get audit logs for ${entityId}:`, error);
      return [];
    }
  }

  async getLogsForUser(userId: string, limit: number = 50) {
    try {
      return await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      logger.error(`Failed to get audit logs for user ${userId}:`, error);
      return [];
    }
  }

  async getRecentLogs(limit: number = 100) {
    try {
      return await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      logger.error("Failed to get recent audit logs:", error);
      return [];
    }
  }
}

export const auditService = new AuditService();
