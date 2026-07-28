/**
 * src/routes/users.routes.ts
 * Réservé à ADMINISTRATEUR_SYSTEME (sauf profil personnel)
 */
import { Router } from "express";
import { usersController } from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/roles.middleware";

const router = Router();
router.use(authMiddleware);

router.get("/", requireAdmin, usersController.getAll);
router.get("/deleted", requireAdmin, usersController.getDeleted);
router.get("/:id", requireAdmin, usersController.getById);
router.post("/", requireAdmin, usersController.create);
router.put("/:id", requireAdmin, usersController.update);
router.delete("/:id", requireAdmin, usersController.softDelete);
router.post("/:id/restore", requireAdmin, usersController.restore);
router.delete("/:id/permanent", requireAdmin, usersController.permanentDelete);
router.patch("/:id/toggle-actif", requireAdmin, usersController.toggleActif);

export default router;
