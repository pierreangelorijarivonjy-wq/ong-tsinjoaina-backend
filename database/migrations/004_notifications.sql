-- =============================================================================
-- Migration 004 : Notifications système
-- =============================================================================
--
-- Ordre d'exécution : 4ème (après 003_members_groups.sql)
-- Dépendances      :
--   - 001_initial_schema.sql  (extensions uuid-ossp)
--   - 003_members_groups.sql  (table users)
--
-- Contenu :
--   - TABLE notifications : alertes et messages pour les utilisateurs
--   - Index de performance
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE : notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Destinataire
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type de notification
  type        VARCHAR(50)  NOT NULL
              CHECK (type IN (
                'INFO',
                'SUCCESS',
                'WARNING',
                'ERROR',
                'SYSTEM',
                'PERMISSION_REQUEST'
              )),

  -- Contenu
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL DEFAULT '',

  -- Lien vers la ressource concernée (chemin interne, ex: '/membres/42')
  link        VARCHAR(500),

  -- État de lecture
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,             -- renseigné automatiquement à la lecture

  -- Expiration optionnelle (NULL = pas d'expiration)
  expires_at  TIMESTAMPTZ,

  -- Émetteur (NULL = notification système automatique)
  sent_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Commentaires de colonne
COMMENT ON COLUMN notifications.link IS
  'Chemin interne vers la ressource concernée, ex: /membres/42';
COMMENT ON COLUMN notifications.expires_at IS
  'Date au-delà de laquelle la notification est considérée expirée (NULL = permanente)';
COMMENT ON COLUMN notifications.sent_by IS
  'NULL pour les notifications système automatiques';


COMMIT;

-- =============================================================================
-- Fin de la migration 004
-- Prochaine étape : exécuter 005_activity_logs.sql
-- =============================================================================
