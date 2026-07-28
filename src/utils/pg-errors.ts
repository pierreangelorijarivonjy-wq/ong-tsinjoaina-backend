/**
 * src/utils/pg-errors.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Codes d'erreur PostgreSQL documentés.
 * Référence : https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * Utilisé par error.middleware.ts pour mapper les erreurs PG
 * vers des réponses HTTP compréhensibles par le frontend.
 */

// ─── Codes d'erreur PG officiels ─────────────────────────────────────────────

export const PG_ERROR_CODES = {
  // Integrity Constraint Violations (classe 23)
  UNIQUE_VIOLATION:       "23505", // Doublon sur une contrainte UNIQUE
  FOREIGN_KEY_VIOLATION:  "23503", // Référence vers un enregistrement inexistant
  NOT_NULL_VIOLATION:     "23502", // NULL dans une colonne NOT NULL
  CHECK_VIOLATION:        "23514", // Violation d'une contrainte CHECK
  EXCLUSION_VIOLATION:    "23P01", // Violation d'une contrainte EXCLUDE

  // Data Exceptions (classe 22)
  STRING_DATA_TOO_LONG:   "22001", // Valeur trop longue pour la colonne (varchar)
  NUMERIC_VALUE_OUT_OF_RANGE: "22003", // Nombre hors de la plage autorisée
  INVALID_TEXT_REPRESENTATION: "22P02", // Ex: UUID invalide, int invalide

  // Connection Errors (classe 08)
  CONNECTION_EXCEPTION:   "08000",
  CONNECTION_DOES_NOT_EXIST: "08003",
  CONNECTION_FAILURE:     "08006",
  SQLCLIENT_UNABLE_TO_ESTABLISH: "08001",

  // Operator Intervention (classe 57)
  QUERY_CANCELED:         "57014", // Requête annulée (statement_timeout)
  ADMIN_SHUTDOWN:         "57P01", // Arrêt intentionnel du serveur
  CRASH_SHUTDOWN:         "57P02",
  CANNOT_CONNECT_NOW:     "57P03", // DB en démarrage / maintenance

  // Insufficient Resources (classe 53)
  TOO_MANY_CONNECTIONS:   "53300",

  // Transaction Rollback (classe 40)
  DEADLOCK_DETECTED:      "40P01",
  SERIALIZATION_FAILURE:  "40001",
} as const;

// ─── Type helper ─────────────────────────────────────────────────────────────

export type PgErrorCode = (typeof PG_ERROR_CODES)[keyof typeof PG_ERROR_CODES];

/**
 * Interface d'une erreur PostgreSQL renvoyée par le driver `pg`.
 * Le driver ajoute ces champs sur l'objet Error natif.
 */
export interface PgError extends Error {
  code?: string;          // Code SQLSTATE (ex: "23505")
  constraint?: string;    // Nom de la contrainte violée
  column?: string;        // Colonne concernée
  table?: string;         // Table concernée
  detail?: string;        // Message détaillé (ex: "Key (email)=(x) already exists.")
  hint?: string;          // Suggestion PostgreSQL
  schema?: string;
  routine?: string;
}

/**
 * Type-guard : détermine si une erreur provient du driver pg.
 */
export function isPgError(err: unknown): err is PgError {
  return (
    err instanceof Error &&
    typeof (err as PgError).code === "string" &&
    /^\d{5}$/.test((err as PgError).code ?? "")
  );
}

/**
 * Construit un message d'erreur utilisateur lisible à partir d'une PgError.
 * N'expose jamais les détails techniques internes (column, table, detail).
 */
export function pgErrorToUserMessage(err: PgError): { status: number; message: string } {
  switch (err.code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      return {
        status: 409,
        message: buildUniqueMessage(err.constraint),
      };

    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return {
        status: 409,
        message: "Opération impossible : la ressource référencée n'existe pas ou est protégée.",
      };

    case PG_ERROR_CODES.NOT_NULL_VIOLATION:
      return {
        status: 400,
        message: `Champ obligatoire manquant${err.column ? ` : ${err.column}` : ""}.`,
      };

    case PG_ERROR_CODES.CHECK_VIOLATION:
      return {
        status: 400,
        message: buildCheckMessage(err.constraint),
      };

    case PG_ERROR_CODES.STRING_DATA_TOO_LONG:
      return {
        status: 400,
        message: `La valeur saisie est trop longue${err.column ? ` pour le champ "${err.column}"` : ""}.`,
      };

    case PG_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE:
      return {
        status: 400,
        message: "La valeur numérique est hors de la plage autorisée.",
      };

    case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
      return {
        status: 400,
        message: "Format de données invalide (identifiant ou valeur incorrecte).",
      };

    case PG_ERROR_CODES.QUERY_CANCELED:
      return {
        status: 504,
        message: "La requête a dépassé le délai maximum autorisé. Veuillez réessayer.",
      };

    case PG_ERROR_CODES.DEADLOCK_DETECTED:
      return {
        status: 409,
        message: "Conflit de transaction. Veuillez réessayer l'opération.",
      };

    case PG_ERROR_CODES.TOO_MANY_CONNECTIONS:
    case PG_ERROR_CODES.CANNOT_CONNECT_NOW:
    case PG_ERROR_CODES.CONNECTION_FAILURE:
      return {
        status: 503,
        message: "Base de données temporairement indisponible. Veuillez réessayer dans quelques instants.",
      };

    default:
      return {
        status: 500,
        message: "Erreur de base de données inattendue.",
      };
  }
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function buildUniqueMessage(constraint?: string): string {
  if (!constraint) return "Cette valeur existe déjà.";

  // Mapper les noms de contraintes DB → messages lisibles
  const messages: Record<string, string> = {
    users_username_key:    "Ce nom d'utilisateur est déjà utilisé.",
    users_email_key:       "Cet email est déjà utilisé.",
    groups_name_key:       "Un groupe avec ce nom existe déjà.",
    networks_name_key:     "Un réseau avec ce nom existe déjà.",
    permissions_code_key:  "Ce code de permission existe déjà.",
    roles_code_key:        "Ce code de rôle existe déjà.",
    formations_member_id_key: "Ce membre a déjà une fiche de formation.",
  };

  return messages[constraint] ?? "Cette valeur existe déjà (contrainte d'unicité).";
}

function buildCheckMessage(constraint?: string): string {
  if (!constraint) return "Valeur non autorisée par les contraintes métier.";

  const messages: Record<string, string> = {
    users_role_applicatif_check: "Le rôle applicatif fourni est invalide.",
    members_sexe_check:          "Le sexe doit être 'M' ou 'F'.",
    members_age_check:           "L'âge doit être compris entre 0 et 150.",
    groups_members_count_check:  "Le nombre de membres ne peut pas être négatif.",
    groups_femmes_count_check:   "Le nombre de femmes ne peut pas être négatif.",
    groups_hommes_count_check:   "Le nombre d'hommes ne peut pas être négatif.",
    groups_menages_count_check:  "Le nombre de ménages ne peut pas être négatif.",
    activity_logs_action_check:  "Le type d'action du journal est invalide.",
    notifications_type_check:    "Le type de notification est invalide.",
    reports_type_check:          "Le type de rapport est invalide.",
    reports_status_check:        "Le statut du rapport est invalide.",
  };

  return messages[constraint] ?? `Contrainte métier violée (${constraint}).`;
}
