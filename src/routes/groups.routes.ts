/**
 * src/routes/groups.routes.ts
 */
import { Router } from "express";
import { groupsController } from "../controllers/groups.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin, requireSaisieOrAbove } from "../middleware/roles.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/", requireSaisieOrAbove, groupsController.getAll);
router.get("/deleted", requireSaisieOrAbove, groupsController.getDeleted);
router.get("/:id", requireSaisieOrAbove, groupsController.getById);
router.post("/", requireSaisieOrAbove, groupsController.create);
router.put("/:id", requireSaisieOrAbove, groupsController.update);
router.delete("/:id", requireSaisieOrAbove, groupsController.softDelete);
router.post("/:id/restore", requireSaisieOrAbove, groupsController.restore);
router.delete("/:id/permanent", requireAdmin, groupsController.permanentDelete);

export default router;
