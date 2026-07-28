/**
 * src/repositories/trash.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Requêtes SQL pour la Corbeille centralisée.
 *
 * Corrections apportées :
 *   1. findAll() : le filtre created_by était injecté par concaténation de string
 *      → remplacé par une requête paramétrée $1 (sécurité SQL injection)
 *   2. emptyAll() : les 4 DELETE étaient parallèles sans transaction
 *      → regroupés dans un BEGIN/COMMIT pour garantir l'atomicité
 */

import db from "../db";
import { TrashItemType } from "../types";

// ─── Types publics ─────────────────────────────────────────────────────────────

export interface TrashItem {
  type: TrashItemType;
  id: string;
  displayName: string;
  deletedAt: string;
  deletedBy?: number | null;
}

export interface TrashSummary {
  totalItems: number;
  members: number;
  groups: number;
  networks: number;
  users: number;
}

// Mapping type → table réelle (liste blanche = protection contre injection SQL)
const TABLE_MAP: Record<TrashItemType, string> = {
  member:  "members",
  group:   "groups",
  network: "networks",
  user:    "users",
};

// ─── Repository ───────────────────────────────────────────────────────────────

export class TrashRepository {
  /**
   * Récupère tous les éléments soft-deleted de toutes les tables.
   *
   * Sécurité : le filtre created_by utilise un paramètre positionnel $1.
   * La clause WHERE est construite par branche conditionnelle, jamais
   * par concaténation de valeur utilisateur.
   */
  async findAll(createdBy?: number): Promise<TrashItem[]> {
    let query: string;
    const params: unknown[] = [];

    if (createdBy != null) {
      params.push(createdBy);
      query = `
        SELECT 'member'  AS type, CAST(id AS TEXT), name AS display_name, deleted_at, deleted_by
        FROM   members  WHERE deleted = TRUE AND created_by = $1

        UNION ALL

        SELECT 'group',  CAST(id AS TEXT), name, deleted_at, deleted_by
        FROM   groups   WHERE deleted = TRUE AND created_by = $1

        UNION ALL

        SELECT 'network', CAST(id AS TEXT), name, deleted_at, deleted_by
        FROM   networks WHERE deleted = TRUE AND created_by = $1

        UNION ALL

        SELECT 'user', CAST(id AS TEXT),
               CONCAT(prenom, ' ', nom, ' (@', username, ')'),
               deleted_at, deleted_by
        FROM   users WHERE deleted = TRUE AND deleted_by = $1

        ORDER BY deleted_at DESC
      `;
    } else {
      query = `
        SELECT 'member'  AS type, CAST(id AS TEXT), name AS display_name, deleted_at, deleted_by
        FROM   members  WHERE deleted = TRUE

        UNION ALL

        SELECT 'group',  CAST(id AS TEXT), name, deleted_at, deleted_by
        FROM   groups   WHERE deleted = TRUE

        UNION ALL

        SELECT 'network', CAST(id AS TEXT), name, deleted_at, deleted_by
        FROM   networks WHERE deleted = TRUE

        UNION ALL

        SELECT 'user', CAST(id AS TEXT),
               CONCAT(prenom, ' ', nom, ' (@', username, ')'),
               deleted_at, deleted_by
        FROM   users WHERE deleted = TRUE

        ORDER BY deleted_at DESC
      `;
    }

    const result = await db.query(query, params);
    return result.rows.map((row) => ({
      type:        row.type        as TrashItemType,
      id:          row.id          as string,
      displayName: row.display_name as string,
      deletedAt:   row.deleted_at  as string,
      deletedBy:   row.deleted_by  as number | null,
    }));
  }

  /**
   * Compte les éléments dans la corbeille par type.
   * 4 requêtes COUNT en parallèle — pas besoin de transaction (lecture seule).
   */
  async getSummary(): Promise<TrashSummary> {
    const [members, groups, networks, users] = await Promise.all([
      db.query<{ count: string }>("SELECT COUNT(*)::int AS count FROM members  WHERE deleted = TRUE"),
      db.query<{ count: string }>("SELECT COUNT(*)::int AS count FROM groups   WHERE deleted = TRUE"),
      db.query<{ count: string }>("SELECT COUNT(*)::int AS count FROM networks WHERE deleted = TRUE"),
      db.query<{ count: string }>("SELECT COUNT(*)::int AS count FROM users    WHERE deleted = TRUE"),
    ]);

    const m = parseInt(String(members.rows[0].count),  10);
    const g = parseInt(String(groups.rows[0].count),   10);
    const n = parseInt(String(networks.rows[0].count), 10);
    const u = parseInt(String(users.rows[0].count),    10);

    return {
      totalItems: m + g + n + u,
      members:    m,
      groups:     g,
      networks:   n,
      users:      u,
    };
  }

  /**
   * Restaure un élément depuis la corbeille.
   * Protection par liste blanche : `table` ne peut venir que de TABLE_MAP.
   */
  async restore(type: TrashItemType, id: string): Promise<boolean> {
    const table = TABLE_MAP[type];
    if (!table) return false;

    const result = await db.query(
      `UPDATE ${table}
       SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
       WHERE id = $1 AND deleted = TRUE
       RETURNING id`,
      [id]
    );
    return !!result.rows[0];
  }

  /**
   * Suppression définitive d'un élément.
   * Protection par liste blanche : `table` ne peut venir que de TABLE_MAP.
   */
  async permanentDelete(type: TrashItemType, id: string): Promise<void> {
    const table = TABLE_MAP[type];
    if (!table) throw new Error(`Type de corbeille invalide : ${type}`);
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  /**
   * Vide la corbeille entière (suppression définitive de tous les soft-deleted).
   *
   * Exécuté dans une transaction unique pour garantir l'atomicité :
   * si un DELETE échoue (ex: FK constraint), tous les autres sont annulés.
   * L'ordre de suppression respecte les dépendances FK :
   *   members (→ formations CASCADE), groups, networks, users en dernier.
   */
  async emptyAll(): Promise<void> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Ordre important : members avant users (FK created_by/deleted_by)
      await client.query("DELETE FROM members  WHERE deleted = TRUE");
      await client.query("DELETE FROM groups   WHERE deleted = TRUE");
      await client.query("DELETE FROM networks WHERE deleted = TRUE");
      await client.query("DELETE FROM users    WHERE deleted = TRUE");

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export const trashRepository = new TrashRepository();
