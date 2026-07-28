/**
 * src/services/activity.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Logique métier pour le Journal d'Activité.
 *
 * Ce service est appelé par tous les autres controllers pour tracer
 * chaque action significative (CRUD, login, export, etc.).
 */

import { activityRepository } from "../repositories/activity.repository";
import {
  ActivityLogModel,
  ActivityLogCreateDto,
  ActivityFilters,
} from "../models/activity.model";

export class ActivityService {
  /**
   * Enregistre une action dans le journal d'audit.
   *
   * Ne lève jamais d'erreur fatale — un échec de log ne doit pas
   * bloquer l'opération principale (ex: créer un membre).
   * Les erreurs sont loguées en console uniquement.
   */
  async log(dto: ActivityLogCreateDto): Promise<void> {
    if (!dto.action) return; // Silencieux si action manquante

    try {
      await activityRepository.create(dto);
    } catch (err) {
      // Le journal ne doit jamais faire crasher l'app
      console.error("[ActivityService] Échec enregistrement journal :", err);
    }
  }

  /**
   * Récupère les entrées du journal avec filtres optionnels.
   * Réservé aux rôles VALIDATION et ADMINISTRATEUR_SYSTEME (garanti par le middleware).
   */
  async getAll(filters: ActivityFilters): Promise<ActivityLogModel[]> {
    return activityRepository.findAll(filters);
  }

  /**
   * Vide entièrement le journal d'audit.
   * Réservé à ADMINISTRATEUR_SYSTEME (garanti par le middleware RBAC).
   */
  async clear(): Promise<void> {
    await activityRepository.clear();
  }
}

export const activityService = new ActivityService();
