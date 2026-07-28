-- =============================================================================
-- Migration 001 : Schéma initial — Extensions & Fonction utilitaire
-- =============================================================================
--
-- Ordre d'exécution : 1er (prérequis de toutes les autres migrations)
--
-- Contenu :
--   - Activation des extensions PostgreSQL nécessaires
--   - Déclaration de la fonction trigger set_updated_at()
--     utilisée par toutes les tables avec un champ updated_at
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI (CREATE EXTENSION IF NOT EXISTS, CREATE OR REPLACE FUNCTION)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions PostgreSQL
-- ---------------------------------------------------------------------------

-- uuid-ossp : génération d'UUIDs v4 (uuid_generate_v4())
-- Utilisé par : activity_logs, notifications, reports
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm : index trigrammes pour recherche ILIKE efficace
-- Utilisé par : members (recherche par nom)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ---------------------------------------------------------------------------
-- Fonction utilitaire : mise à jour automatique de updated_at
-- ---------------------------------------------------------------------------
-- Déclarée ici car référencée par tous les triggers des tables suivantes.
-- La syntaxe CREATE OR REPLACE FUNCTION garantit l'idempotence.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


COMMIT;

-- =============================================================================
-- Fin de la migration 001
-- Prochaine étape : exécuter 002_roles_permissions.sql
-- =============================================================================
