/**
 * src/routes/activity.routes.ts
 */
import { Router } from "express";
import { activityController } from "../controllers/activity.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin, requireValidationOrAbove } from "../middleware/roles.middleware";

const router = Router();
router.use(authMiddleware);

router.post("/", activityController.log);                              // Tout utilisateur authentifié
router.get("/", requireValidationOrAbove, activityController.getAll); // VALIDATION + ADMIN
router.delete("/", requireAdmin, activityController.clear);            // ADMIN uniquement

export default router;
