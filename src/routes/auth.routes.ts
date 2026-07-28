/**
 * src/routes/auth.routes.ts
 * --------------------------
 * POST /auth/login  → public
 * POST /auth/logout → authentifié
 * GET  /auth/me     → authentifié
 */

import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);

export default router;
