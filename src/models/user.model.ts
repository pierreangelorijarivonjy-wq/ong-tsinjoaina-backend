/**
 * src/models/user.model.ts
 * ─────────────────────────
 * Interfaces et DTOs pour les Utilisateurs.
 */

import { RoleApplicatif } from "../types";

// ─── Modèle complet (sans password_hash) ─────────────────────────────────────

export interface UserModel {
  id: number;
  nom: string;
  prenom: string;
  username: string;
  email: string;
  telephone: string;
  role_applicatif: RoleApplicatif;
  actif: boolean;
  fonction: string;
  commune: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: number | null;
}

// ─── Modèle interne (avec password_hash pour auth) ───────────────────────────

export interface UserInternalModel extends UserModel {
  password_hash: string;
}

// ─── DTO création ─────────────────────────────────────────────────────────────

export interface UserCreateDto {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  telephone?: string;
  mot_de_passe: string;
  role_applicatif: RoleApplicatif;
  actif?: boolean;
  fonction?: string;
  commune?: string;
}

// ─── DTO mise à jour ──────────────────────────────────────────────────────────

export interface UserUpdateDto {
  nom?: string;
  prenom?: string;
  username?: string;
  email?: string;
  telephone?: string;
  actif?: boolean;
  fonction?: string;
  commune?: string;
  mot_de_passe?: string; // optionnel — hashé côté service
}

// ─── Mapper row DB → UserModel (sans password_hash) ──────────────────────────

export function rowToUser(row: Record<string, unknown>): UserModel {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _ph, ...safe } = row as Record<string, unknown>;
  return {
    ...(safe as Omit<UserModel, "deletedAt" | "deletedBy">),
    deletedAt: (row.deleted_at as string) ?? null,
    deletedBy: (row.deleted_by as number) ?? null,
  };
}
