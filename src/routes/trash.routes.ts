/**
 * src/routes/trash.routes.ts
 */
import { Router } from "express";
import { trashController } from "../controllers/trash.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin, requireSaisieOrAbove } from "../middleware/roles.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/", requireSaisieOrAbove, trashController.getAll);
router.get("/summary", requireSaisieOrAbove, trashController.getSummary);
router.delete("/empty", requireAdmin, trashController.emptyAll);                       // Avant /:type/:id
router.post("/:type/:id/restore", requireSaisieOrAbove, trashController.restore);
router.delete("/:type/:id", requireAdmin, trashController.permanentDelete);

export default router;
