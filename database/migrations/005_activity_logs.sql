-- =============================================================================
-- Migration 005 : Journal d'audit & Rapports
-- =============================================================================
--
-- Ordre d'exécution : 5ème (après 004_notifications.sql)
-- Dépendances      :
--   - 001_initial_schema.sql  (extensions uuid-ossp)
--   - 003_members_groups.sql  (table users)
--
-- Contenu :
--   - TABLE activity_logs : journal complet de toutes les actions utilisateurs
--   - TABLE reports       : historique des rapports générés/exportés
--
-- Notes de conception :
--   - activity_logs utilise UUID comme PK (haute volumétrie, pas de séquence)
--   - Les logs ne sont jamais supprimés (pas de soft delete) — archivage seulement
--   - user_id est nullable (ON DELETE SET NULL) : les logs sont conservés même
--     si l'utilisateur est supprimé définitivement
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE : activity_logs (Journal d'audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Utilisateur à l'origine de l'action (conservé même si user supprimé)
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  user_name  VARCHAR(200) NOT NULL DEFAULT '',   -- snapshot dénormalisé
  user_role  VARCHAR(60)  NOT NULL DEFAULT '',   -- snapshot dénormalisé

  -- Type d'action
  action     VARCHAR(60)  NOT NULL
             CHECK (action IN (
               'LOGIN',
               'LOGOUT',
               'CREATION',
               'MODIFICATION',
               'SUPPRESSION',
               'RESTAURATION',
               'IMPORT',
               'EXPORT',
               'IMPRESSION',
               'CONSULTATION'
             )),

  -- Contexte de l'action
  resource    VARCHAR(60)  NOT NULL DEFAULT '',  -- ex: 'members', 'groups', 'users'
  resource_id TEXT,                              -- ID de la ressource concernée (nullable)
  details     TEXT         NOT NULL DEFAULT '',  -- description libre de l'action

  -- Métadonnées techniques (utiles pour la sécurité)
  ip_address  INET,
  user_agent  TEXT,

  timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Commentaires
COMMENT ON TABLE  activity_logs IS
  'Journal d''audit immuable — aucune suppression permise (archivage seulement)';
COMMENT ON COLUMN activity_logs.user_name IS
  'Snapshot dénormalisé du nom d''utilisateur au moment de l''action';
COMMENT ON COLUMN activity_logs.user_role IS
  'Snapshot dénormalisé du rôle au moment de l''action';
COMMENT ON COLUMN activity_logs.resource_id IS
  'Identifiant de la ressource (TEXT pour accepter INTEGER et UUID)';


-- ---------------------------------------------------------------------------
-- TABLE : reports (Rapports générés)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(300) NOT NULL,

  -- Type de rapport
  type          VARCHAR(60)  NOT NULL
                CHECK (type IN (
                  'MEMBRES',
                  'GROUPES',
                  'RESEAUX',
                  'ACTIVITES',
                  'STATISTIQUES',
                  'EXPORT_CSV',
                  'IMPRESSION'
                )),

  -- Paramètres de filtrage au moment de la génération
  filters       JSONB        NOT NULL DEFAULT '{}',

  -- Résumé des résultats
  records_count INTEGER      NOT NULL DEFAULT 0 CHECK (records_count >= 0),
  status        VARCHAR(30)  NOT NULL DEFAULT 'GENERE'
                CHECK (status IN ('GENERE', 'EN_ATTENTE', 'ERREUR')),

  -- Qui a généré le rapport
  generated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN reports.filters IS
  'Snapshot JSON des filtres actifs lors de la génération (commune, groupe, dates, etc.)';


COMMIT;

-- =============================================================================
-- Fin de la migration 005
-- Prochaine étape : exécuter 006_trash.sql
-- =============================================================================
