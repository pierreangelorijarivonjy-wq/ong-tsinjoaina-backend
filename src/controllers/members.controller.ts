/**
 * src/controllers/members.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour les Membres.
 * Extrait les données de req, délègue à memberService, renvoie la réponse.
 * Enregistre chaque opération d'écriture dans le journal d'activité.
 */

import { Response } from "express";
import { memberService } from "../services/member.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const membersController = {
  /** GET /members */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    const { search, groupName, reseau, commune, sexe, created_by } = req.query;
    const data = await memberService.getAll({
      search:     search     as string | undefined,
      groupName:  groupName  as string | undefined,
      reseau:     reseau     as string | undefined,
      commune:    commune    as string | undefined,
      sexe:       sexe       as string | undefined,
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /members/deleted */
  async getDeleted(req: AuthRequest, res: Response): Promise<void> {
    const { created_by } = req.query;
    const data = await memberService.getDeleted({
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /members/:id */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const member = await memberService.getById(req.params.id);
    res.json({ success: true, data: member });
  },

  /** POST /members */
  async create(req: AuthRequest, res: Response): Promise<void> {
    const member = await memberService.create(req.body, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "CREATION",
      resource:   "members",
      resourceId: String(member.id),
      details:    `Création du membre "${member.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.status(201).json({ success: true, data: member });
  },

  /** PUT /members/:id */
  async update(req: AuthRequest, res: Response): Promise<void> {
    const member = await memberService.update(req.params.id, req.body);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "MODIFICATION",
      resource:   "members",
      resourceId: String(member.id),
      details:    `Modification du membre "${member.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, data: member });
  },

  /** DELETE /members/:id */
  async softDelete(req: AuthRequest, res: Response): Promise<void> {
    await memberService.softDelete(req.params.id, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "members",
      resourceId: req.params.id,
      details:    `Membre #${req.params.id} déplacé dans la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Membre déplacé dans la corbeille." });
  },

  /** POST /members/:id/restore */
  async restore(req: AuthRequest, res: Response): Promise<void> {
    await memberService.restore(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "RESTAURATION",
      resource:   "members",
      resourceId: req.params.id,
      details:    `Membre #${req.params.id} restauré depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Membre restauré avec succès." });
  },

  /** DELETE /members/:id/permanent */
  async permanentDelete(req: AuthRequest, res: Response): Promise<void> {
    await memberService.permanentDelete(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "members",
      resourceId: req.params.id,
      details:    `Membre #${req.params.id} supprimé définitivement.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Membre supprimé définitivement." });
  },
};
