/**
 * src/controllers/auth.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour l'authentification.
 * Délègue toute la logique à authService.
 * Trace les connexions et déconnexions dans le journal d'activité.
 */

import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const authController = {
  /**
   * POST /auth/login
   * Body: { usernameOrEmail: string, mot_de_passe: string }
   */
  async login(req: Request, res: Response): Promise<void> {
    const { usernameOrEmail, mot_de_passe } = req.body;

    if (!usernameOrEmail || !mot_de_passe) {
      res.status(400).json({
        success: false,
        error: "Identifiant et mot de passe requis.",
      });
      return;
    }

    const result = await authService.login({ usernameOrEmail, mot_de_passe });

    // Tracer la connexion dans le journal
    await activityService.log({
      userId:   result.user.id,
      userName: result.user.username,
      userRole: result.user.role_applicatif,
      action:   "LOGIN",
      resource: "auth",
      details:  `Connexion réussie depuis ${req.ip ?? "IP inconnue"}.`,
      ipAddress: req.ip ?? null,
    });

    res.status(200).json({ success: true, data: result });
  },

  /**
   * POST /auth/logout
   * JWT stateless — le client supprime le token localement.
   * On trace quand même la déconnexion pour le journal d'audit.
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    if (req.user) {
      await activityService.log({
        userId:   req.user.userId,
        userName: req.user.username,
        userRole: req.user.role_applicatif,
        action:   "LOGOUT",
        resource: "auth",
        details:  "Déconnexion.",
        ipAddress: req.ip ?? null,
      });
    }

    res.status(200).json({ success: true, message: "Déconnexion réussie." });
  },

  /**
   * GET /auth/me
   * Retourne le profil de l'utilisateur connecté.
   */
  async me(req: AuthRequest, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.userId);
    res.status(200).json({ success: true, data: user });
  },
};
