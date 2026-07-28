/**
 * src/controllers/groups.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour les Groupes de Solidarité.
 * Enregistre chaque opération d'écriture dans le journal d'activité.
 */

import { Response } from "express";
import { groupService } from "../services/group.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const groupsController = {
  /** GET /groups */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    const { search, village, fokontany, commune, created_by } = req.query;
    const data = await groupService.getAll({
      search:     search     as string | undefined,
      village:    village    as string | undefined,
      fokontany:  fokontany  as string | undefined,
      commune:    commune    as string | undefined,
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /groups/deleted */
  async getDeleted(req: AuthRequest, res: Response): Promise<void> {
    const { created_by } = req.query;
    const data = await groupService.getDeleted({
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /groups/:id */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const group = await groupService.getById(req.params.id);
    res.json({ success: true, data: group });
  },

  /** POST /groups */
  async create(req: AuthRequest, res: Response): Promise<void> {
    const group = await groupService.create(req.body, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "CREATION",
      resource:   "groups",
      resourceId: String(group.id),
      details:    `Création du groupe "${group.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.status(201).json({ success: true, data: group });
  },

  /** PUT /groups/:id */
  async update(req: AuthRequest, res: Response): Promise<void> {
    const group = await groupService.update(req.params.id, req.body);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "MODIFICATION",
      resource:   "groups",
      resourceId: String(group.id),
      details:    `Modification du groupe "${group.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, data: group });
  },

  /** DELETE /groups/:id */
  async softDelete(req: AuthRequest, res: Response): Promise<void> {
    await groupService.softDelete(req.params.id, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "groups",
      resourceId: req.params.id,
      details:    `Groupe #${req.params.id} déplacé dans la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Groupe déplacé dans la corbeille." });
  },

  /** POST /groups/:id/restore */
  async restore(req: AuthRequest, res: Response): Promise<void> {
    await groupService.restore(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "RESTAURATION",
      resource:   "groups",
      resourceId: req.params.id,
      details:    `Groupe #${req.params.id} restauré depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Groupe restauré avec succès." });
  },

  /** DELETE /groups/:id/permanent */
  async permanentDelete(req: AuthRequest, res: Response): Promise<void> {
    await groupService.permanentDelete(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "groups",
      resourceId: req.params.id,
      details:    `Groupe #${req.params.id} supprimé définitivement.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Groupe supprimé définitivement." });
  },
};
