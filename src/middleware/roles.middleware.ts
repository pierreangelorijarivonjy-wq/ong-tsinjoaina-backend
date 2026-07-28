/**
 * src/middleware/roles.middleware.ts
 * ----------------------------------
 * RBAC : Restreint l'accès selon le rôle applicatif de l'utilisateur.
 *
 * Hiérarchie des rôles :
 *   ADMINISTRATEUR_SYSTEME  → accès total
 *   VALIDATION              → consulter + valider + rapports
 *   SAISIE                  → consulter + créer + modifier + supprimer ses données
 *   CONSULTATION            → lecture seule
 */

import { Response, NextFunction } from "express";
import { AuthRequest, RoleApplicatif } from "../types";

// Hiérarchie numérique des rôles (plus le nombre est élevé, plus de droits)
const ROLE_HIERARCHY: Record<RoleApplicatif, number> = {
  CONSULTATION: 1,
  SAISIE: 2,
  VALIDATION: 3,
  ADMINISTRATEUR_SYSTEME: 4,
};

/**
 * requireRole(roles) — Vérifie que l'utilisateur a l'un des rôles listés.
 * Exemple: requireRole(["ADMINISTRATEUR_SYSTEME"])
 */
export function requireRole(roles: RoleApplicatif[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Non authentifié." });
      return;
    }

    if (!roles.includes(req.user.role_applicatif)) {
      res.status(403).json({
        success: false,
        error: `Accès refusé. Rôle requis : ${roles.join(" ou ")}.`,
      });
      return;
    }

    next();
  };
}

/**
 * requireMinRole(minRole) — Vérifie que l'utilisateur a un niveau ≥ minRole.
 * Exemple: requireMinRole("SAISIE") autorise SAISIE, VALIDATION et ADMIN.
 */
export function requireMinRole(minRole: RoleApplicatif) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Non authentifié." });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role_applicatif] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < minLevel) {
      res.status(403).json({
        success: false,
        error: `Accès refusé. Niveau minimum requis : ${minRole}.`,
      });
      return;
    }

    next();
  };
}

// Raccourcis pratiques
export const requireAdmin = requireRole(["ADMINISTRATEUR_SYSTEME"]);
export const requireSaisieOrAbove = requireMinRole("SAISIE");
export const requireValidationOrAbove = requireMinRole("VALIDATION");
