/**
 * src/models/activity.model.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Interfaces et DTOs pour le Journal d'Activité.
 *
 * Correspond exactement à la table activity_logs (migration 005) :
 *   id, user_id, user_name, user_role, action,
 *   resource, resource_id, details, ip_address, user_agent, timestamp
 */

import { ActivityAction, RoleApplicatif } from "../types";

// ─── Modèle complet ───────────────────────────────────────────────────────────

export interface ActivityLogModel {
  id: string;              // UUID PRIMARY KEY
  userId: number | null;   // user_id (nullable si user supprimé)
  userName: string;        // snapshot dénormalisé du nom
  userRole: RoleApplicatif; // snapshot dénormalisé du rôle
  action: ActivityAction;  // type d'action (CHECK constraint)
  resource: string;        // entité concernée : 'members', 'groups', 'users', etc.
  resourceId: string | null; // ID de la ressource (string pour accepter UUID et int)
  details: string;         // description libre de l'action
  ipAddress: string | null; // IP de l'appelant (INET en DB)
  timestamp: string;       // horodatage ISO 8601
}

// ─── DTO création ──────────────────────────────────────────────────────────────

export interface ActivityLogCreateDto {
  userId: number;
  userName: string;
  userRole: RoleApplicatif;
  action: ActivityAction;
  resource: string;           // requis : quelle entité est concernée
  resourceId?: string | null; // optionnel : ID de la ressource
  details?: string;           // optionnel : description (défaut: '')
  ipAddress?: string | null;  // optionnel : IP du client
}

// ─── Filtres de recherche ─────────────────────────────────────────────────────

export interface ActivityFilters {
  userId?: number;
  action?: ActivityAction;
  resource?: string;  // filtrer par type d'entité
  search?: string;
  limit?: number;
}

// ─── Mapper row DB → ActivityLogModel ────────────────────────────────────────

export function rowToActivity(row: Record<string, unknown>): ActivityLogModel {
  return {
    id:          row.id as string,
    userId:      (row.user_id as number) ?? null,
    userName:    row.user_name as string,
    userRole:    row.user_role as RoleApplicatif,
    action:      row.action as ActivityAction,
    resource:    (row.resource as string) ?? "",
    resourceId:  (row.resource_id as string) ?? null,
    details:     (row.details as string) ?? "",
    ipAddress:   (row.ip_address as string) ?? null,
    timestamp:   row.timestamp as string,
  };
}
