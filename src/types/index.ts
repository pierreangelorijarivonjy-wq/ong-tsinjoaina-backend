/**
 * src/types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Interfaces TypeScript partagées entre controllers, routes et middleware.
 * Miroir fidèle des types du frontend (lib/types.ts).
 */

// ─── Rôles applicatifs ────────────────────────────────────────────────────────

export type RoleApplicatif =
  | "ADMINISTRATEUR_SYSTEME"
  | "SAISIE"
  | "CONSULTATION"
  | "VALIDATION";

// ─── Formations ───────────────────────────────────────────────────────────────

export interface Formations {
  gestionSimplifiee: boolean;
  eau: boolean;
  sol: boolean;
  vegetaux: boolean;
  agroecologie: boolean;
  productionSemences: boolean;
  alimentationSaine: boolean;
  eah: boolean;
  nutrition: boolean;
  conservationProduits: boolean;
  transformationProduits: boolean;
  genre: boolean;
  epracc: boolean;
  autre: string;
}

// ─── Membres ──────────────────────────────────────────────────────────────────

export interface Member {
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
  formations: Formations;
  autonome: boolean;
  created_by?: number;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: number;
}

// ─── Groupes de Solidarité ────────────────────────────────────────────────────

export interface SolidariteGroup {
  id?: number;
  name: string;
  village: string;
  fokontany: string;
  commune: string;
  membersCount: number;
  femmesCount: number;
  hommesCount: number;
  menagesCount: number;
  created_by?: number;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: number;
}

// ─── Réseaux de Solidarité ────────────────────────────────────────────────────

export interface Network {
  id?: number;
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
  deletedAt?: string;
  deletedBy?: number;
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  nom: string;
  prenom: string;
  username: string;
  email: string;
  telephone: string;
  password_hash?: string; // Jamais envoyé au frontend
  role_applicatif: RoleApplicatif;
  actif: boolean;
  fonction: string;
  commune: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: number;
}

// ─── Journal d'activité ───────────────────────────────────────────────────────

/**
 * Doit correspondre exactement au CHECK constraint dans la migration 005 :
 *   CHECK (action IN (
 *     'LOGIN', 'LOGOUT',
 *     'CREATION', 'MODIFICATION', 'SUPPRESSION', 'RESTAURATION',
 *     'IMPORT', 'EXPORT', 'IMPRESSION',
 *     'CONSULTATION'          ← inclus ici
 *   ))
 */
export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATION"
  | "MODIFICATION"
  | "SUPPRESSION"
  | "RESTAURATION"
  | "IMPORT"
  | "EXPORT"
  | "IMPRESSION"
  | "CONSULTATION";   // ← ajouté pour correspondre au schema SQL

export interface ActivityLog {
  id: string;
  userId: number | null;
  userName: string;
  userRole: RoleApplicatif;
  action: ActivityAction;
  resource: string;
  resourceId?: string | null;
  details: string;
  ipAddress?: string | null;
  timestamp: string;
}

// ─── Corbeille ────────────────────────────────────────────────────────────────

export type TrashItemType = "member" | "group" | "network" | "user";

export interface TrashItem {
  type: TrashItemType;
  id: string | number;
  displayName: string;
  deletedAt: string;
  deletedBy?: number;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: number;
  username: string;
  role_applicatif: RoleApplicatif;
  iat?: number;
  exp?: number;
}

// ─── Réponse API standard ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Express Request augmenté ─────────────────────────────────────────────────

import { Request } from "express";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
