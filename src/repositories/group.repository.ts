/**
 * src/repositories/group.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Toutes les requêtes SQL pour les Groupes de Solidarité (table groups).
 *
 * Colonnes complètes (migration 003) :
 *   id, name, village, fokontany, commune,
 *   members_count, femmes_count, hommes_count, menages_count,
 *   created_by, created_at, updated_at, deleted, deleted_at, deleted_by
 */

import db from "../db";
import { IRepository } from "./base.repository";
import {
  GroupModel,
  GroupCreateDto,
  GroupUpdateDto,
  GroupFilters,
  rowToGroup,
} from "../models/group.model";

export class GroupRepository
  implements IRepository<GroupModel, GroupCreateDto, GroupUpdateDto, GroupFilters>
{
  // ─── Lecture ─────────────────────────────────────────────────────────────────

  async findAll(filters: GroupFilters = {}): Promise<GroupModel[]> {
    let query = "SELECT * FROM groups WHERE deleted = FALSE";
    const params: unknown[] = [];

    if (filters.created_by != null) {
      params.push(filters.created_by);
      query += ` AND created_by = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (name ILIKE $${params.length} OR village ILIKE $${params.length})`;
    }
    if (filters.village) {
      params.push(filters.village);
      query += ` AND village = $${params.length}`;
    }
    if (filters.fokontany) {
      params.push(filters.fokontany);
      query += ` AND fokontany = $${params.length}`;
    }
    if (filters.commune) {
      params.push(filters.commune);
      query += ` AND commune = $${params.length}`;
    }

    query += " ORDER BY name ASC";
    const result = await db.query(query, params);
    return result.rows.map(rowToGroup);
  }

  async findDeleted(filters: Partial<GroupFilters> = {}): Promise<GroupModel[]> {
    let query = "SELECT * FROM groups WHERE deleted = TRUE";
    const params: unknown[] = [];

    if (filters.created_by != null) {
      params.push(filters.created_by);
      query += ` AND created_by = $${params.length}`;
    }

    query += " ORDER BY deleted_at DESC";
    const result = await db.query(query, params);
    return result.rows.map(rowToGroup);
  }

  async findById(id: number | string): Promise<GroupModel | null> {
    const result = await db.query(
      "SELECT * FROM groups WHERE id = $1",
      [id]
    );
    return result.rows[0] ? rowToGroup(result.rows[0]) : null;
  }

  // ─── Écriture ─────────────────────────────────────────────────────────────────

  async create(data: GroupCreateDto, createdBy?: number): Promise<GroupModel> {
    const result = await db.query(
      `INSERT INTO groups
         (name, village, fokontany, commune,
          members_count, femmes_count, hommes_count, menages_count,
          created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        data.village     ?? "",
        data.fokontany   ?? "",
        data.commune     ?? "",   // ← colonne présente en DB, absente avant
        data.membersCount ?? 0,
        data.femmesCount  ?? 0,
        data.hommesCount  ?? 0,
        data.menagesCount ?? 0,
        createdBy ?? null,
      ]
    );
    return rowToGroup(result.rows[0]);
  }

  async update(id: number | string, data: GroupUpdateDto): Promise<GroupModel | null> {
    const result = await db.query(
      `UPDATE groups SET
         name          = $1,
         village       = $2,
         fokontany     = $3,
         commune       = $4,
         members_count = $5,
         femmes_count  = $6,
         hommes_count  = $7,
         menages_count = $8
       WHERE id = $9 AND deleted = FALSE
       RETURNING *`,
      [
        data.name,
        data.village     ?? "",
        data.fokontany   ?? "",
        data.commune     ?? "",   // ← inclus dans le UPDATE
        data.membersCount ?? 0,
        data.femmesCount  ?? 0,
        data.hommesCount  ?? 0,
        data.menagesCount ?? 0,
        id,
      ]
    );
    return result.rows[0] ? rowToGroup(result.rows[0]) : null;
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────────

  async softDelete(id: number | string, deletedBy?: number): Promise<boolean> {
    const result = await db.query(
      `UPDATE groups
       SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND deleted = FALSE
       RETURNING id`,
      [deletedBy ?? null, id]
    );
    return !!result.rows[0];
  }

  async restore(id: number | string): Promise<boolean> {
    const result = await db.query(
      `UPDATE groups
       SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
       WHERE id = $1 AND deleted = TRUE
       RETURNING id`,
      [id]
    );
    return !!result.rows[0];
  }

  async permanentDelete(id: number | string): Promise<void> {
    await db.query("DELETE FROM groups WHERE id = $1", [id]);
  }
}

export const groupRepository = new GroupRepository();
