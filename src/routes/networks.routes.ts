/**
 * src/routes/networks.routes.ts
 */
import { Router } from "express";
import { networksController } from "../controllers/networks.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin, requireSaisieOrAbove } from "../middleware/roles.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/", requireSaisieOrAbove, networksController.getAll);
router.get("/deleted", requireSaisieOrAbove, networksController.getDeleted);
router.get("/:id", requireSaisieOrAbove, networksController.getById);
router.post("/", requireSaisieOrAbove, networksController.create);
router.put("/:id", requireSaisieOrAbove, networksController.update);
router.delete("/:id", requireSaisieOrAbove, networksController.softDelete);
router.post("/:id/restore", requireSaisieOrAbove, networksController.restore);
router.delete("/:id/permanent", requireAdmin, networksController.permanentDelete);

export default router;
