/**
 * src/controllers/networks.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour les Réseaux de Solidarité.
 * Enregistre chaque opération d'écriture dans le journal d'activité.
 */

import { Response } from "express";
import { networkService } from "../services/network.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const networksController = {
  /** GET /networks */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    const { search, autonome, created_by } = req.query;
    const data = await networkService.getAll({
      search:     search     as string | undefined,
      autonome:   autonome !== undefined ? autonome === "true" : undefined,
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /networks/deleted */
  async getDeleted(req: AuthRequest, res: Response): Promise<void> {
    const { created_by } = req.query;
    const data = await networkService.getDeleted({
      created_by: created_by ? Number(created_by) : undefined,
    });
    res.json({ success: true, data });
  },

  /** GET /networks/:id */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const network = await networkService.getById(req.params.id);
    res.json({ success: true, data: network });
  },

  /** POST /networks */
  async create(req: AuthRequest, res: Response): Promise<void> {
    const network = await networkService.create(req.body, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "CREATION",
      resource:   "networks",
      resourceId: String(network.id),
      details:    `Création du réseau "${network.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.status(201).json({ success: true, data: network });
  },

  /** PUT /networks/:id */
  async update(req: AuthRequest, res: Response): Promise<void> {
    const network = await networkService.update(req.params.id, req.body);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "MODIFICATION",
      resource:   "networks",
      resourceId: String(network.id),
      details:    `Modification du réseau "${network.name}".`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, data: network });
  },

  /** DELETE /networks/:id */
  async softDelete(req: AuthRequest, res: Response): Promise<void> {
    await networkService.softDelete(req.params.id, req.user?.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "networks",
      resourceId: req.params.id,
      details:    `Réseau #${req.params.id} déplacé dans la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Réseau déplacé dans la corbeille." });
  },

  /** POST /networks/:id/restore */
  async restore(req: AuthRequest, res: Response): Promise<void> {
    await networkService.restore(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "RESTAURATION",
      resource:   "networks",
      resourceId: req.params.id,
      details:    `Réseau #${req.params.id} restauré depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Réseau restauré avec succès." });
  },

  /** DELETE /networks/:id/permanent */
  async permanentDelete(req: AuthRequest, res: Response): Promise<void> {
    await networkService.permanentDelete(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "networks",
      resourceId: req.params.id,
      details:    `Réseau #${req.params.id} supprimé définitivement.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Réseau supprimé définitivement." });
  },
};
