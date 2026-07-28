/**
 * src/models/group.model.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Interfaces et DTOs pour les Groupes de Solidarité.
 *
 * Correspond à la table groups (migration 003) :
 *   id, name, village, fokontany, commune,
 *   members_count, femmes_count, hommes_count, menages_count,
 *   created_by, created_at, updated_at, deleted, deleted_at, deleted_by
 */

// ─── Modèle complet ───────────────────────────────────────────────────────────

export interface GroupModel {
  id: number;
  name: string;
  village: string;
  fokontany: string;
  commune: string;        // ← présent en DB (migration 003)
  membersCount: number;
  femmesCount: number;
  hommesCount: number;
  menagesCount: number;
  created_by?: number;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: number | null;
}

// ─── DTO création ─────────────────────────────────────────────────────────────

export interface GroupCreateDto {
  name: string;
  village?: string;
  fokontany?: string;
  commune?: string;       // ← ajouté pour correspondre à la DB
  membersCount?: number;
  femmesCount?: number;
  hommesCount?: number;
  menagesCount?: number;
}

// ─── DTO mise à jour ──────────────────────────────────────────────────────────

export type GroupUpdateDto = Partial<GroupCreateDto>;

// ─── Filtres de recherche ─────────────────────────────────────────────────────

export interface GroupFilters {
  search?: string;
  village?: string;
  fokontany?: string;
  commune?: string;       // ← ajouté pour cohérence avec les filtres membres
  created_by?: number;
}

// ─── Mapper row DB → GroupModel ───────────────────────────────────────────────

export function rowToGroup(row: Record<string, unknown>): GroupModel {
  return {
    id:           row.id as number,
    name:         row.name as string,
    village:      (row.village as string) ?? "",
    fokontany:    (row.fokontany as string) ?? "",
    commune:      (row.commune as string) ?? "",   // ← mapper depuis DB
    membersCount: (row.members_count as number) ?? 0,
    femmesCount:  (row.femmes_count as number) ?? 0,
    hommesCount:  (row.hommes_count as number) ?? 0,
    menagesCount: (row.menages_count as number) ?? 0,
    created_by:   row.created_by as number | undefined,
    deleted:      row.deleted as boolean | undefined,
    deletedAt:    (row.deleted_at as string) ?? null,
    deletedBy:    (row.deleted_by as number) ?? null,
  };
}
