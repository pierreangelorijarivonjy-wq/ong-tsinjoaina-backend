/**
 * src/repositories/network.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Toutes les requêtes SQL pour les Réseaux de Solidarité (table networks).
 *
 * Colonnes complètes (migration 003) :
 *   id, name, gs_members (JSONB), femmes_count, hommes_count, menages_count,
 *   dev_activity, plaidoyer, dev_plan, autonome,
 *   created_by, created_at, updated_at, deleted, deleted_at, deleted_by
 *
 * Note sur gs_members (JSONB) :
 *   Le driver `pg` sérialise/désérialise automatiquement JSONB.
 *   ✅ Passer un tableau JS directement : `['GS1', 'GS2']`
 *   ❌ NE PAS utiliser JSON.stringify() — cela double-encode en string JSON
 */

import db from "../db";
import { IRepository } from "./base.repository";
import {
  NetworkModel,
  NetworkCreateDto,
  NetworkUpdateDto,
  NetworkFilters,
  rowToNetwork,
} from "../models/network.model";

export class NetworkRepository
  implements IRepository<NetworkModel, NetworkCreateDto, NetworkUpdateDto, NetworkFilters>
{
  // ─── Lecture ─────────────────────────────────────────────────────────────────

  async findAll(filters: NetworkFilters = {}): Promise<NetworkModel[]> {
    let query = "SELECT * FROM networks WHERE deleted = FALSE";
    const params: unknown[] = [];

    if (filters.created_by != null) {
      params.push(filters.created_by);
      query += ` AND created_by = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (filters.autonome !== undefined) {
      params.push(filters.autonome);
      query += ` AND autonome = $${params.length}`;
    }

    query += " ORDER BY name ASC";
    const result = await db.query(query, params);
    return result.rows.map(rowToNetwork);
  }

  async findDeleted(filters: Partial<NetworkFilters> = {}): Promise<NetworkModel[]> {
    let query = "SELECT * FROM networks WHERE deleted = TRUE";
    const params: unknown[] = [];

    if (filters.created_by != null) {
      params.push(filters.created_by);
      query += ` AND created_by = $${params.length}`;
    }

    query += " ORDER BY deleted_at DESC";
    const result = await db.query(query, params);
    return result.rows.map(rowToNetwork);
  }

  async findById(id: number | string): Promise<NetworkModel | null> {
    const result = await db.query(
      "SELECT * FROM networks WHERE id = $1",
      [id]
    );
    return result.rows[0] ? rowToNetwork(result.rows[0]) : null;
  }

  // ─── Écriture ─────────────────────────────────────────────────────────────────

  async create(data: NetworkCreateDto, createdBy?: number): Promise<NetworkModel> {
    const result = await db.query(
      `INSERT INTO networks
         (name, gs_members, femmes_count, hommes_count, menages_count,
          dev_activity, plaidoyer, dev_plan, autonome, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.name,
        // pg sérialise automatiquement les tableaux JS en JSONB — pas de JSON.stringify
        data.gsMembers   ?? [],
        data.femmesCount ?? 0,
        data.hommesCount ?? 0,
        data.menagesCount ?? 0,
        data.devActivity ?? false,
        data.plaidoyer   ?? false,
        data.devPlan     ?? false,
        data.autonome    ?? false,
        createdBy ?? null,
      ]
    );
    return rowToNetwork(result.rows[0]);
  }

  async update(id: number | string, data: NetworkUpdateDto): Promise<NetworkModel | null> {
    const result = await db.query(
      `UPDATE networks SET
         name          = $1,
         gs_members    = $2,
         femmes_count  = $3,
         hommes_count  = $4,
         menages_count = $5,
         dev_activity  = $6,
         plaidoyer     = $7,
         dev_plan      = $8,
         autonome      = $9
       WHERE id = $10 AND deleted = FALSE
       RETURNING *`,
      [
        data.name,
        // pg sérialise automatiquement les tableaux JS en JSONB
        data.gsMembers   ?? [],
        data.femmesCount ?? 0,
        data.hommesCount ?? 0,
        data.menagesCount ?? 0,
        data.devActivity ?? false,
        data.plaidoyer   ?? false,
        data.devPlan     ?? false,
        data.autonome    ?? false,
        id,
      ]
    );
    return result.rows[0] ? rowToNetwork(result.rows[0]) : null;
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────────

  async softDelete(id: number | string, deletedBy?: number): Promise<boolean> {
    const result = await db.query(
      `UPDATE networks
       SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND deleted = FALSE
       RETURNING id`,
      [deletedBy ?? null, id]
    );
    return !!result.rows[0];
  }

  async restore(id: number | string): Promise<boolean> {
    const result = await db.query(
      `UPDATE networks
       SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
       WHERE id = $1 AND deleted = TRUE
       RETURNING id`,
      [id]
    );
    return !!result.rows[0];
  }

  async permanentDelete(id: number | string): Promise<void> {
    await db.query("DELETE FROM networks WHERE id = $1", [id]);
  }
}

export const networkRepository = new NetworkRepository();
