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
} from "../controllers/store.controller";
import { checkAuth } from "../middlewares/auth.middleware";
import { createStoreLimiter, deleteStoreLimiter } from "../middlewares/rate-limit.middleware";

const router: Router = Router();

router.use(checkAuth);

router.post("/stores", createStoreLimiter, createStore);
router.get("/stores", listStores);
router.get("/stores/:id", getStore);
router.get("/stores/:id/status", getStoreStatus);
router.get("/stores/:id/logs", getStoreLogs);
router.get("/stores/:id/audit", getStoreAuditLogs);
router.delete("/stores/:id", deleteStoreLimiter, deleteStore);
router.get("/metrics", getMetrics);

export default router;
