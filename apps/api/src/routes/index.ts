import { Router } from "express";
import storeRoutes from "./store.routes";

const router: Router = Router();

// Register all routes
router.use(storeRoutes);

export default router;
