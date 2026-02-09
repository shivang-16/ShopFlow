import { Router } from "express";
import {
  createStore,
  listStores,
  getStore,
  getStoreStatus,
  getStoreLogs,
  getStoreAuditLogs,
  deleteStore,
  getMetrics,
  retryProvision,
} from "../controllers/store.controller";
import { checkAuth } from "../middlewares/auth.middleware";
import { strictLimiter } from "../middlewares/rate-limit.middleware";

const router: Router = Router();

router.use(checkAuth);

// Stricter rate limits for create/delete operations (5 req/min)
router.post("/stores", strictLimiter, createStore);
router.post("/stores/:id/retry", strictLimiter, retryProvision);
router.delete("/stores/:id", strictLimiter, deleteStore);

// Normal rate limits for read operations (20 req/min via app-level middleware)
router.get("/stores", listStores);
router.get("/stores/:id", getStore);
router.get("/stores/:id/status", getStoreStatus);
router.get("/stores/:id/logs", getStoreLogs);
router.get("/stores/:id/audit", getStoreAuditLogs);
router.get("/metrics", getMetrics);

export default router;
