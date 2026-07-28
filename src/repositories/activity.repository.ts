/**
 * src/repositories/activity.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Toutes les requêtes SQL pour le Journal d'Activité (table activity_logs).
 *
 * Colonnes complètes de la table (migration 005) :
 *   id UUID, user_id, user_name, user_role, action,
 *   resource, resource_id, details, ip_address, user_agent, timestamp
 */

import db from "../db";
import {
  ActivityLogModel,
  ActivityLogCreateDto,
  ActivityFilters,
  rowToActivity,
} from "../models/activity.model";

export class ActivityRepository {
  /**
   * Enregistre une action dans le journal d'audit.
   * INSERT avec toutes les colonnes disponibles dans le schema.
   * Les champs optionnels (resource_id, ip_address) defaultent à NULL.
   */
  async create(data: ActivityLogCreateDto): Promise<void> {
    await db.query(
      `INSERT INTO activity_logs
         (user_id, user_name, user_role, action,
          resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.userId,
        data.userName,
        data.userRole,
        data.action,
        data.resource  ?? "",
        data.resourceId ?? null,
        data.details   ?? "",
        data.ipAddress  ?? null,
      ]
    );
  }

  /**
   * Récupère les entrées du journal avec filtres optionnels.
   * Toutes les clauses WHERE utilisent des paramètres $N (pas de concaténation).
   * Limite plafonnée à 1000 pour éviter les requêtes trop lourdes.
   */
  async findAll(filters: ActivityFilters = {}): Promise<ActivityLogModel[]> {
    let query = "SELECT * FROM activity_logs WHERE TRUE";
    const params: unknown[] = [];

    if (filters.userId != null) {
      params.push(filters.userId);
      query += ` AND user_id = $${params.length}`;
    }
    if (filters.action) {
      params.push(filters.action);
      query += ` AND action = $${params.length}`;
    }
    if (filters.resource) {
      params.push(filters.resource);
      query += ` AND resource = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (details ILIKE $${params.length} OR user_name ILIKE $${params.length})`;
    }

    // Limit avec plafond de sécurité
    const limit = Math.min(Math.max(filters.limit ?? 500, 1), 1000);
    params.push(limit);
    query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

    const result = await db.query(query, params);
    return result.rows.map(rowToActivity);
  }

  /**
   * Supprime tous les logs.
   * Réservé aux ADMINISTRATEUR_SYSTEME (garanti par le middleware RBAC).
   * TRUNCATE est plus performant que DELETE pour vider une table entière.
   */
  async clear(): Promise<void> {
    // TRUNCATE RESTART IDENTITY : vide la table et réinitialise les séquences
    // Pour UUID il n'y a pas de séquence, mais c'est idempotent.
    await db.query("TRUNCATE TABLE activity_logs");
  }
}

export const activityRepository = new ActivityRepository();
