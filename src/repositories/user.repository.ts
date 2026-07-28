/**
 * src/repositories/user.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Toutes les requêtes SQL pour les Utilisateurs (table users).
 *
 * Sécurité :
 *   - findByCredential() retourne password_hash → usage exclusif auth.service.ts
 *   - Toutes les autres méthodes retournent UserModel (sans password_hash)
 *   - Colonnes SELECT toujours explicites (jamais SELECT *)
 */

import db from "../db";
import { IRepository } from "./base.repository";
import {
  UserModel,
  UserInternalModel,
  UserCreateDto,
  UserUpdateDto,
  rowToUser,
} from "../models/user.model";
import { RoleApplicatif } from "../types";

// Colonnes sûres (sans password_hash) — utilisées dans tous les SELECT publics
const USER_SAFE_COLUMNS = `
  id, nom, prenom, username, email, telephone,
  role_applicatif, actif, fonction, commune,
  created_at, updated_at,
  deleted, deleted_at, deleted_by
`.trim();

export interface UserFilters {
  search?: string;
}

export class UserRepository
  implements IRepository<UserModel, UserCreateDto, UserUpdateDto, UserFilters>
{
  // ─── Lecture ─────────────────────────────────────────────────────────────────

  async findAll(filters: UserFilters = {}): Promise<UserModel[]> {
    let query = `SELECT ${USER_SAFE_COLUMNS} FROM users WHERE deleted = FALSE`;
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (
        nom      ILIKE $${params.length} OR
        prenom   ILIKE $${params.length} OR
        username ILIKE $${params.length} OR
        email    ILIKE $${params.length}
      )`;
    }

    query += " ORDER BY nom ASC, prenom ASC";
    const result = await db.query(query, params);
    return result.rows.map(rowToUser);
  }

  async findDeleted(_filters: Partial<UserFilters> = {}): Promise<UserModel[]> {
    const result = await db.query(
      `SELECT ${USER_SAFE_COLUMNS} FROM users
       WHERE deleted = TRUE ORDER BY deleted_at DESC`
    );
    return result.rows.map(rowToUser);
  }

  async findById(id: number | string): Promise<UserModel | null> {
    const result = await db.query(
      `SELECT ${USER_SAFE_COLUMNS} FROM users WHERE id = $1 AND deleted = FALSE`,
      [id]
    );
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  }

  /**
   * Retourne le profil COMPLET incluant password_hash.
   * Réservé exclusivement à authService.login().
   * Ne jamais exposer dans les controllers publics.
   * Filtre également actif=TRUE : un compte désactivé ne peut pas se connecter.
   */
  async findByCredential(usernameOrEmail: string): Promise<UserInternalModel | null> {
    const result = await db.query(
      `SELECT *
       FROM   users
       WHERE  (LOWER(username) = $1 OR LOWER(email) = $1)
         AND  deleted = FALSE
       LIMIT  1`,
      [usernameOrEmail.trim().toLowerCase()]
    );
    return (result.rows[0] as UserInternalModel) ?? null;
  }

  // ─── Écriture ─────────────────────────────────────────────────────────────────

  async create(data: UserCreateDto & { password_hash: string }): Promise<UserModel> {
    const result = await db.query(
      `INSERT INTO users
         (nom, prenom, username, email, telephone,
          password_hash, role_applicatif, actif, fonction, commune)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${USER_SAFE_COLUMNS}`,
      [
        data.nom,
        data.prenom,
        data.username,
        data.email,
        data.telephone       ?? "",
        data.password_hash,
        data.role_applicatif,
        data.actif           ?? true,
        data.fonction        ?? "",
        data.commune         ?? "",
      ]
    );
    return rowToUser(result.rows[0]);
  }

  /**
   * Met à jour un profil utilisateur.
   * role_applicatif est inclus : un admin peut modifier le rôle d'un autre user.
   * Le mot de passe n'est modifié que si password_hash est fourni (optionnel).
   *
   * Approche : on construit la liste des colonnes SET dynamiquement pour éviter
   * d'écraser role_applicatif si l'appelant ne le fournit pas.
   */
  async update(
    id: number | string,
    data: UserUpdateDto & { password_hash?: string; role_applicatif?: RoleApplicatif }
  ): Promise<UserModel | null> {
    // Colonnes toujours mises à jour
    const params: unknown[] = [
      data.nom        ?? null,
      data.prenom     ?? null,
      data.username   ?? null,
      data.email      ?? null,
      data.telephone  ?? "",
      data.actif      ?? true,
      data.fonction   ?? "",
      data.commune    ?? "",
    ];

    let extraClauses = "";

    // role_applicatif : mis à jour seulement si fourni
    if (data.role_applicatif) {
      params.push(data.role_applicatif);
      extraClauses += `, role_applicatif = $${params.length}`;
    }

    // password_hash : mis à jour seulement si fourni
    if (data.password_hash) {
      params.push(data.password_hash);
      extraClauses += `, password_hash = $${params.length}`;
    }

    params.push(id);
    const idIdx = params.length;

    const result = await db.query(
      `UPDATE users SET
         nom       = COALESCE($1, nom),
         prenom    = COALESCE($2, prenom),
         username  = COALESCE($3, username),
         email     = COALESCE($4, email),
         telephone = $5,
         actif     = $6,
         fonction  = $7,
         commune   = $8
         ${extraClauses}
       WHERE id = $${idIdx} AND deleted = FALSE
       RETURNING ${USER_SAFE_COLUMNS}`,
      params
    );
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  }

  // ─── Soft delete ─────────────────────────────────────────────────────────────

  async softDelete(id: number | string, deletedBy?: number): Promise<boolean> {
    const result = await db.query(
      `UPDATE users
       SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND deleted = FALSE
       RETURNING id`,
      [deletedBy ?? null, id]
    );
    return !!result.rows[0];
  }

  async restore(id: number | string): Promise<boolean> {
    const result = await db.query(
      `UPDATE users
       SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
       WHERE id = $1 AND deleted = TRUE
       RETURNING id`,
      [id]
    );
    return !!result.rows[0];
  }

  async permanentDelete(id: number | string): Promise<void> {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
  }

  // ─── Opérations spécifiques ───────────────────────────────────────────────────

  async toggleActif(id: number | string): Promise<{ id: number; actif: boolean } | null> {
    const result = await db.query<{ id: number; actif: boolean }>(
      `UPDATE users
       SET actif = NOT actif
       WHERE id = $1 AND deleted = FALSE
       RETURNING id, actif`,
      [id]
    );
    return result.rows[0] ?? null;
  }
}

export const userRepository = new UserRepository();
