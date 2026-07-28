/**
 * src/controllers/activity.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour le Journal d'Activité.
 * Accès restreint : VALIDATION et ADMINISTRATEUR_SYSTEME (garanti par routes).
 */

import { Response } from "express";
import { activityService } from "../services/activity.service";
import { AuthRequest, ActivityAction } from "../types";

export const activityController = {
  /**
   * POST /activity
   * Permet au frontend d'enregistrer manuellement certaines actions
   * (ex: IMPRESSION, EXPORT, CONSULTATION) qui ne passent pas par les CRUD.
   */
  async log(req: AuthRequest, res: Response): Promise<void> {
    const { action, resource, resourceId, details } = req.body;
    const user = req.user!;

    await activityService.log({
      userId:     user.userId,
      userName:   user.username,          // Snapshot du nom depuis le JWT
      userRole:   user.role_applicatif,
      action:     action as ActivityAction,
      resource:   resource   ?? "",
      resourceId: resourceId ?? null,
      details:    details    ?? "",
      ipAddress:  req.ip ?? null,
    });

    res.status(201).json({ success: true, message: "Action enregistrée." });
  },

  /**
   * GET /activity
   * Récupère le journal avec filtres. Réservé VALIDATION+.
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    const { userId, action, resource, search, limit } = req.query;

    const data = await activityService.getAll({
      userId:   userId   ? Number(userId)  : undefined,
      action:   action   as ActivityAction | undefined,
      resource: resource as string | undefined,
      search:   search   as string | undefined,
      limit:    limit    ? Number(limit)   : 500,
    });

    res.json({ success: true, data });
  },

  /**
   * DELETE /activity
   * Vide entièrement le journal. Réservé ADMINISTRATEUR_SYSTEME uniquement.
   */
  async clear(req: AuthRequest, res: Response): Promise<void> {
    await activityService.clear();

    // Tracer l'action de nettoyage elle-même
    await activityService.log({
      userId:   req.user!.userId,
      userName: req.user!.username,
      userRole: req.user!.role_applicatif,
      action:   "SUPPRESSION",
      resource: "activity",
      details:  "Journal d'activité vidé.",
      ipAddress: req.ip ?? null,
    });

    res.json({ success: true, message: "Journal vidé." });
  },
};
