/**
 * src/controllers/trash.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour la Corbeille centralisée.
 * Enregistre les opérations de restauration et suppression définitive.
 */

import { Response } from "express";
import { trashService } from "../services/trash.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const trashController = {
  /** GET /trash */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    const { created_by } = req.query;
    const data = await trashService.getAll(
      created_by ? Number(created_by) : undefined
    );
    res.json({ success: true, data });
  },

  /** GET /trash/summary */
  async getSummary(_req: AuthRequest, res: Response): Promise<void> {
    const data = await trashService.getSummary();
    res.json({ success: true, data });
  },

  /** POST /trash/:type/:id/restore */
  async restore(req: AuthRequest, res: Response): Promise<void> {
    const { type, id } = req.params;
    await trashService.restore(type, id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "RESTAURATION",
      resource:   "trash",
      resourceId: id,
      details:    `Élément "${type}#${id}" restauré depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: `${type} restauré avec succès.` });
  },

  /** DELETE /trash/:type/:id */
  async permanentDelete(req: AuthRequest, res: Response): Promise<void> {
    const { type, id } = req.params;
    await trashService.permanentDelete(type, id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "trash",
      resourceId: id,
      details:    `Élément "${type}#${id}" supprimé définitivement depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: `${type} supprimé définitivement.` });
  },

  /** DELETE /trash/empty */
  async emptyAll(req: AuthRequest, res: Response): Promise<void> {
    await trashService.emptyAll();

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "trash",
      details:    "Corbeille entière vidée (suppression définitive de tous les éléments).",
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Corbeille vidée." });
  },
};
