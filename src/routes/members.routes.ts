/**
 * src/routes/members.routes.ts
 * ─────────────────────────────
 * GET    /members              → liste (filtres: search, groupName, reseau, commune, sexe, created_by)
 * GET    /members/deleted      → corbeille membres
 * GET    /members/:id          → détail
 * POST   /members              → créer
 * PUT    /members/:id          → modifier
 * DELETE /members/:id          → soft delete
 * POST   /members/:id/restore  → restaurer
 * DELETE /members/:id/permanent → suppr. définitive (ADMIN)
 */

import { Router } from "express";
import { membersController } from "../controllers/members.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin, requireSaisieOrAbove } from "../middleware/roles.middleware";

const router = Router();

// Toutes les routes membres nécessitent une authentification
router.use(authMiddleware);

router.get("/", requireSaisieOrAbove, membersController.getAll);
router.get("/deleted", requireSaisieOrAbove, membersController.getDeleted);
router.get("/:id", requireSaisieOrAbove, membersController.getById);
router.post("/", requireSaisieOrAbove, membersController.create);
router.put("/:id", requireSaisieOrAbove, membersController.update);
router.delete("/:id", requireSaisieOrAbove, membersController.softDelete);
router.post("/:id/restore", requireSaisieOrAbove, membersController.restore);
router.delete("/:id/permanent", requireAdmin, membersController.permanentDelete);

export default router;
