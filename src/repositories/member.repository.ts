/**
 * src/repositories/member.repository.ts
 * ────────────────────────────────────────
 * Toutes les requêtes SQL pour les Membres.
 * Implémente IRepository<MemberModel, ...>.
 */

import db from "../db";
import { IRepository } from "./base.repository";
import {
  MemberModel,
  MemberCreateDto,
  MemberUpdateDto,
  MemberFilters,
  MEMBER_SELECT,
  rowToMember,
} from "../models/member.model";

export class MemberRepository
  implements IRepository<MemberModel, MemberCreateDto, MemberUpdateDto, MemberFilters>
{
  // ─── Lecture ────────────────────────────────────────────────────────────────

  async findAll(filters: MemberFilters = {}): Promise<MemberModel[]> {
    let query = `${MEMBER_SELECT} WHERE m.deleted = FALSE`;
    const params: unknown[] = [];

    if (filters.created_by) {
      params.push(filters.created_by);
      query += ` AND m.created_by = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (m.name ILIKE $${params.length} OR m.group_name ILIKE $${params.length})`;
    }
    if (filters.groupName) {
      params.push(filters.groupName);
      query += ` AND m.group_name = $${params.length}`;
    }
    if (filters.reseau) {
      params.push(filters.reseau);
      query += ` AND m.reseau = $${params.length}`;
    }
    if (filters.commune) {
      params.push(filters.commune);
      query += ` AND m.commune = $${params.length}`;
    }
    if (filters.sexe) {
      params.push(filters.sexe);
      query += ` AND m.sexe = $${params.length}`;
    }

    query += " ORDER BY m.id ASC";
    const result = await db.query(query, params);
    return result.rows.map(rowToMember);
  }

  async findDeleted(filters: Partial<MemberFilters> = {}): Promise<MemberModel[]> {
    let query = `${MEMBER_SELECT} WHERE m.deleted = TRUE`;
    const params: unknown[] = [];

    if (filters.created_by) {
      params.push(filters.created_by);
      query += ` AND m.created_by = $${params.length}`;
    }

    query += " ORDER BY m.deleted_at DESC";
    const result = await db.query(query, params);
    return result.rows.map(rowToMember);
  }

  async findById(id: number | string): Promise<MemberModel | null> {
    const result = await db.query(`${MEMBER_SELECT} WHERE m.id = $1`, [id]);
    return result.rows[0] ? rowToMember(result.rows[0]) : null;
  }

  // ─── Écriture ───────────────────────────────────────────────────────────────

  async create(data: MemberCreateDto, createdBy?: number): Promise<MemberModel> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const memberRes = await client.query(
        `INSERT INTO members
          (name, chef_menage, no_menage, group_name, group_creation_date,
           village, fokontany, commune, age, sexe, responsabilite, reseau,
           autonome, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          data.name,
          data.chefMenage ?? "",
          data.noMenage ?? "",
          data.groupName ?? "",
          data.groupCreationDate ?? "",
          data.village ?? "",
          data.fokontany ?? "",
          data.commune ?? "",
          data.age ?? 0,
          data.sexe ?? "M",
          data.responsabilite ?? "",
          data.reseau ?? "",
          data.autonome ?? false,
          createdBy ?? null,
        ]
      );

      const member = memberRes.rows[0];
      const f = data.formations ?? {};

      await client.query(
        `INSERT INTO formations
          (member_id, gestion_simplifiee, eau, sol, vegetaux, agroecologie,
           production_semences, alimentation_saine, eah, nutrition,
           conservation_produits, transformation_produits, genre, epracc, autre)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          member.id,
          f.gestionSimplifiee ?? false,
          f.eau ?? false,
          f.sol ?? false,
          f.vegetaux ?? false,
          f.agroecologie ?? false,
          f.productionSemences ?? false,
          f.alimentationSaine ?? false,
          f.eah ?? false,
          f.nutrition ?? false,
          f.conservationProduits ?? false,
          f.transformationProduits ?? false,
          f.genre ?? false,
          f.epracc ?? false,
          f.autre ?? "",
        ]
      );

      await client.query("COMMIT");

      const full = await db.query(`${MEMBER_SELECT} WHERE m.id = $1`, [member.id]);
      return rowToMember(full.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: number | string, data: MemberUpdateDto): Promise<MemberModel | null> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE members SET
          name=$1, chef_menage=$2, no_menage=$3, group_name=$4, group_creation_date=$5,
          village=$6, fokontany=$7, commune=$8, age=$9, sexe=$10,
          responsabilite=$11, reseau=$12, autonome=$13
         WHERE id=$14 AND deleted = FALSE`,
        [
          data.name, data.chefMenage, data.noMenage, data.groupName, data.groupCreationDate,
          data.village, data.fokontany, data.commune, data.age, data.sexe,
          data.responsabilite, data.reseau, data.autonome ?? false, id,
        ]
      );

      if (data.formations) {
        const f = data.formations;
        await client.query(
          `UPDATE formations SET
            gestion_simplifiee=$1, eau=$2, sol=$3, vegetaux=$4, agroecologie=$5,
            production_semences=$6, alimentation_saine=$7, eah=$8, nutrition=$9,
            conservation_produits=$10, transformation_produits=$11, genre=$12,
            epracc=$13, autre=$14
           WHERE member_id=$15`,
          [
            f.gestionSimplifiee, f.eau, f.sol, f.vegetaux, f.agroecologie,
            f.productionSemences, f.alimentationSaine, f.eah, f.nutrition,
            f.conservationProduits, f.transformationProduits, f.genre, f.epracc,
            f.autre ?? "", id,
          ]
        );
      }

      await client.query("COMMIT");

      return this.findById(id);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Soft delete ────────────────────────────────────────────────────────────

  async softDelete(id: number | string, deletedBy?: number): Promise<boolean> {
    const result = await db.query(
      `UPDATE members SET deleted=TRUE, deleted_at=NOW(), deleted_by=$1
       WHERE id=$2 AND deleted=FALSE RETURNING id`,
      [deletedBy ?? null, id]
    );
    return !!result.rows[0];
  }

  async restore(id: number | string): Promise<boolean> {
    const result = await db.query(
      `UPDATE members SET deleted=FALSE, deleted_at=NULL, deleted_by=NULL
       WHERE id=$1 AND deleted=TRUE RETURNING id`,
      [id]
    );
    return !!result.rows[0];
  }

  async permanentDelete(id: number | string): Promise<void> {
    await db.query("DELETE FROM members WHERE id=$1", [id]);
  }
}

export const memberRepository = new MemberRepository();
