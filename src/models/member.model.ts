/**
 * src/models/member.model.ts
 * ───────────────────────────
 * Interfaces et DTOs pour les Membres.
 * Contient aussi le mapper rowToMember() et la constante SQL SELECT.
 */

import { Formations } from "../types";

// ─── Modèle complet ──────────────────────────────────────────────────────────

export interface MemberModel {
  id: number;
  name: string;
  chefMenage: string;
  noMenage: string;
  groupName: string;
  groupCreationDate: string;
  village: string;
  fokontany: string;
  commune: string;
  age: number;
  sexe: "M" | "F";
  responsabilite: string;
  reseau: string;
  autonome: boolean;
  formations: Formations;
  created_by?: number;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: number | null;
}

// ─── DTO création ─────────────────────────────────────────────────────────────

export interface MemberCreateDto {
  name: string;
  chefMenage?: string;
  noMenage?: string;
  groupName?: string;
  groupCreationDate?: string;
  village?: string;
  fokontany?: string;
  commune?: string;
  age?: number;
  sexe?: "M" | "F";
  responsabilite?: string;
  reseau?: string;
  autonome?: boolean;
  formations?: Partial<Formations>;
}

// ─── DTO mise à jour ──────────────────────────────────────────────────────────

export type MemberUpdateDto = Partial<MemberCreateDto>;

// ─── Filtres de recherche ─────────────────────────────────────────────────────

export interface MemberFilters {
  search?: string;
  groupName?: string;
  reseau?: string;
  commune?: string;
  sexe?: string;
  created_by?: number;
}

// ─── Requête SQL SELECT avec JOIN formations ──────────────────────────────────

export const MEMBER_SELECT = `
  SELECT m.*,
    f.gestion_simplifiee, f.eau, f.sol, f.vegetaux, f.agroecologie,
    f.production_semences, f.alimentation_saine, f.eah, f.nutrition,
    f.conservation_produits, f.transformation_produits, f.genre, f.epracc, f.autre
  FROM members m
  LEFT JOIN formations f ON f.member_id = m.id
`;

// ─── Mapper row DB → MemberModel ─────────────────────────────────────────────

export function rowToMember(row: Record<string, unknown>): MemberModel {
  return {
    id: row.id as number,
    name: row.name as string,
    chefMenage: row.chef_menage as string,
    noMenage: row.no_menage as string,
    groupName: row.group_name as string,
    groupCreationDate: row.group_creation_date as string,
    village: row.village as string,
    fokontany: row.fokontany as string,
    commune: row.commune as string,
    age: row.age as number,
    sexe: row.sexe as "M" | "F",
    responsabilite: row.responsabilite as string,
    reseau: row.reseau as string,
    autonome: row.autonome as boolean,
    created_by: row.created_by as number | undefined,
    deleted: row.deleted as boolean | undefined,
    deletedAt: (row.deleted_at as string) ?? null,
    deletedBy: (row.deleted_by as number) ?? null,
    formations: {
      gestionSimplifiee: row.gestion_simplifiee as boolean,
      eau: row.eau as boolean,
      sol: row.sol as boolean,
      vegetaux: row.vegetaux as boolean,
      agroecologie: row.agroecologie as boolean,
      productionSemences: row.production_semences as boolean,
      alimentationSaine: row.alimentation_saine as boolean,
      eah: row.eah as boolean,
      nutrition: row.nutrition as boolean,
      conservationProduits: row.conservation_produits as boolean,
      transformationProduits: row.transformation_produits as boolean,
      genre: row.genre as boolean,
      epracc: row.epracc as boolean,
      autre: (row.autre as string) ?? "",
    },
  };
}
