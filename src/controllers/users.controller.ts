/**
 * src/controllers/users.controller.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptateur HTTP pour les Utilisateurs.
 * Réservé à ADMINISTRATEUR_SYSTEME (sauf /auth/me géré dans auth.routes).
 * Enregistre chaque opération d'écriture dans le journal d'activité.
 */

import { Response } from "express";
import { userService } from "../services/user.service";
import { activityService } from "../services/activity.service";
import { AuthRequest } from "../types";

export const usersController = {
  /** GET /users */
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const data = await userService.getAll();
    res.json({ success: true, data });
  },

  /** GET /users/deleted */
  async getDeleted(_req: AuthRequest, res: Response): Promise<void> {
    const data = await userService.getDeleted();
    res.json({ success: true, data });
  },

  /** GET /users/:id */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const user = await userService.getById(req.params.id);
    res.json({ success: true, data: user });
  },

  /** POST /users */
  async create(req: AuthRequest, res: Response): Promise<void> {
    const user = await userService.create(req.body);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "CREATION",
      resource:   "users",
      resourceId: String(user.id),
      details:    `Création de l'utilisateur "${user.username}" (${user.role_applicatif}).`,
      ipAddress:  req.ip ?? null,
    });

    res.status(201).json({ success: true, data: user });
  },

  /** PUT /users/:id */
  async update(req: AuthRequest, res: Response): Promise<void> {
    const user = await userService.update(req.params.id, req.body);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "MODIFICATION",
      resource:   "users",
      resourceId: String(user.id),
      details:    `Modification de l'utilisateur "${user.username}".`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, data: user });
  },

  /** DELETE /users/:id */
  async softDelete(req: AuthRequest, res: Response): Promise<void> {
    await userService.softDelete(req.params.id, req.user!.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "users",
      resourceId: req.params.id,
      details:    `Utilisateur #${req.params.id} déplacé dans la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Utilisateur déplacé dans la corbeille." });
  },

  /** POST /users/:id/restore */
  async restore(req: AuthRequest, res: Response): Promise<void> {
    await userService.restore(req.params.id);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "RESTAURATION",
      resource:   "users",
      resourceId: req.params.id,
      details:    `Utilisateur #${req.params.id} restauré depuis la corbeille.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Utilisateur restauré avec succès." });
  },

  /** DELETE /users/:id/permanent */
  async permanentDelete(req: AuthRequest, res: Response): Promise<void> {
    await userService.permanentDelete(req.params.id, req.user!.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "SUPPRESSION",
      resource:   "users",
      resourceId: req.params.id,
      details:    `Utilisateur #${req.params.id} supprimé définitivement.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, message: "Utilisateur supprimé définitivement." });
  },

  /** PATCH /users/:id/toggle-actif */
  async toggleActif(req: AuthRequest, res: Response): Promise<void> {
    const result = await userService.toggleActif(req.params.id, req.user!.userId);

    await activityService.log({
      userId:     req.user!.userId,
      userName:   req.user!.username,
      userRole:   req.user!.role_applicatif,
      action:     "MODIFICATION",
      resource:   "users",
      resourceId: req.params.id,
      details:    `Compte utilisateur #${req.params.id} ${result.actif ? "activé" : "désactivé"}.`,
      ipAddress:  req.ip ?? null,
    });

    res.json({ success: true, data: result });
  },
};
