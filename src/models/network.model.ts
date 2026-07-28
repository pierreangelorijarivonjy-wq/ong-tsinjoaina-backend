/**
 * src/models/network.model.ts
 * ────────────────────────────
 * Interfaces et DTOs pour les Réseaux de Solidarité.
 */

// ─── Modèle complet ──────────────────────────────────────────────────────────

export interface NetworkModel {
  id: number;
  name: string;
  gsMembers: string[];
  femmesCount: number;
  hommesCount: number;
  menagesCount: number;
  devActivity: boolean;
  plaidoyer: boolean;
  devPlan: boolean;
  autonome: boolean;
  created_by?: number;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: number | null;
}

// ─── DTO création ─────────────────────────────────────────────────────────────

export interface NetworkCreateDto {
  name: string;
  gsMembers?: string[];
  femmesCount?: number;
  hommesCount?: number;
  menagesCount?: number;
  devActivity?: boolean;
  plaidoyer?: boolean;
  devPlan?: boolean;
  autonome?: boolean;
}

// ─── DTO mise à jour ──────────────────────────────────────────────────────────

export type NetworkUpdateDto = Partial<NetworkCreateDto>;

// ─── Filtres de recherche ─────────────────────────────────────────────────────

export interface NetworkFilters {
  search?: string;
  autonome?: boolean;
  created_by?: number;
}

// ─── Mapper row DB → NetworkModel ────────────────────────────────────────────

export function rowToNetwork(row: Record<string, unknown>): NetworkModel {
  return {
    id: row.id as number,
    name: row.name as string,
    gsMembers: (row.gs_members as string[]) ?? [],
    femmesCount: row.femmes_count as number,
    hommesCount: row.hommes_count as number,
    menagesCount: row.menages_count as number,
    devActivity: row.dev_activity as boolean,
    plaidoyer: row.plaidoyer as boolean,
    devPlan: row.dev_plan as boolean,
    autonome: row.autonome as boolean,
    created_by: row.created_by as number | undefined,
    deleted: row.deleted as boolean | undefined,
    deletedAt: (row.deleted_at as string) ?? null,
    deletedBy: (row.deleted_by as number) ?? null,
  };
}
