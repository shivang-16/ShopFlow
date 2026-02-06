import { Router } from "express";
import { createStore, listStores, deleteStore } from "../controllers/store.controller";
import { checkAuth } from "../middlewares/auth.middleware";

const router: Router = Router();

router.use(checkAuth);

// Store Routes
router.post("/stores", createStore);
router.get("/stores", listStores);
router.delete("/stores/:id", deleteStore);

export default router;
