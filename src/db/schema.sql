-- =============================================================================
-- schema.sql — Tsinjo Aina ONG Database
-- =============================================================================
-- Instructions :
--   1. Aller dans Supabase → SQL Editor
--   2. Coller ce fichier entier et cliquer "Run"
--   3. Toutes les tables seront créées
-- =============================================================================

-- Extension UUID (déjà activée sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE : users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  nom              VARCHAR(100) NOT NULL,
  prenom           VARCHAR(100) NOT NULL,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  email            VARCHAR(150) NOT NULL UNIQUE,
  telephone        VARCHAR(20)  DEFAULT '',
  password_hash    VARCHAR(255) NOT NULL,
  role_applicatif  VARCHAR(50)  NOT NULL DEFAULT 'CONSULTATION'
                   CHECK (role_applicatif IN (
                     'ADMINISTRATEUR_SYSTEME', 'SAISIE', 'CONSULTATION', 'VALIDATION'
                   )),
  actif            BOOLEAN      NOT NULL DEFAULT TRUE,
  fonction         VARCHAR(100) DEFAULT '',
  commune          VARCHAR(100) DEFAULT '',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  deleted_by       INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE : groups (Groupes de Solidarité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,
  village       VARCHAR(100) NOT NULL DEFAULT '',
  fokontany     VARCHAR(100) NOT NULL DEFAULT '',
  members_count INTEGER      NOT NULL DEFAULT 0,
  femmes_count  INTEGER      NOT NULL DEFAULT 0,
  hommes_count  INTEGER      NOT NULL DEFAULT 0,
  menages_count INTEGER      NOT NULL DEFAULT 0,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  deleted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE : networks (Réseaux de Solidarité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS networks (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,
  gs_members    JSONB        NOT NULL DEFAULT '[]',  -- Array of group names
  femmes_count  INTEGER      NOT NULL DEFAULT 0,
  hommes_count  INTEGER      NOT NULL DEFAULT 0,
  menages_count INTEGER      NOT NULL DEFAULT 0,
  dev_activity  BOOLEAN      NOT NULL DEFAULT FALSE,
  plaidoyer     BOOLEAN      NOT NULL DEFAULT FALSE,
  dev_plan      BOOLEAN      NOT NULL DEFAULT FALSE,
  autonome      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  deleted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE : members (Membres)
-- =============================================================================
CREATE TABLE IF NOT EXISTS members (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,
  chef_menage           VARCHAR(200) NOT NULL DEFAULT '',
  no_menage             VARCHAR(50)  NOT NULL DEFAULT '',
  group_name            VARCHAR(200) NOT NULL DEFAULT '',
  group_creation_date   VARCHAR(50)  NOT NULL DEFAULT '',
  village               VARCHAR(100) NOT NULL DEFAULT '',
  fokontany             VARCHAR(100) NOT NULL DEFAULT '',
  commune               VARCHAR(100) NOT NULL DEFAULT '',
  age                   INTEGER      NOT NULL DEFAULT 0,
  sexe                  CHAR(1)      NOT NULL CHECK (sexe IN ('M', 'F')),
  responsabilite        VARCHAR(100) NOT NULL DEFAULT '',
  reseau                VARCHAR(200) NOT NULL DEFAULT '',
  autonome              BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted               BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at            TIMESTAMPTZ,
  deleted_by            INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE : formations (liée à members 1-to-1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS formations (
  id                      SERIAL PRIMARY KEY,
  member_id               INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  gestion_simplifiee      BOOLEAN NOT NULL DEFAULT FALSE,
  eau                     BOOLEAN NOT NULL DEFAULT FALSE,
  sol                     BOOLEAN NOT NULL DEFAULT FALSE,
  vegetaux                BOOLEAN NOT NULL DEFAULT FALSE,
  agroecologie            BOOLEAN NOT NULL DEFAULT FALSE,
  production_semences     BOOLEAN NOT NULL DEFAULT FALSE,
  alimentation_saine      BOOLEAN NOT NULL DEFAULT FALSE,
  eah                     BOOLEAN NOT NULL DEFAULT FALSE,
  nutrition               BOOLEAN NOT NULL DEFAULT FALSE,
  conservation_produits   BOOLEAN NOT NULL DEFAULT FALSE,
  transformation_produits BOOLEAN NOT NULL DEFAULT FALSE,
  genre                   BOOLEAN NOT NULL DEFAULT FALSE,
  epracc                  BOOLEAN NOT NULL DEFAULT FALSE,
  autre                   TEXT    NOT NULL DEFAULT ''
);

-- =============================================================================
-- TABLE : activity_logs (Journal d'activité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  user_name  VARCHAR(200) NOT NULL,
  user_role  VARCHAR(50)  NOT NULL,
  action     VARCHAR(50)  NOT NULL
             CHECK (action IN (
               'LOGIN', 'LOGOUT', 'CREATION', 'MODIFICATION',
               'SUPPRESSION', 'RESTAURATION', 'IMPORT', 'EXPORT', 'IMPRESSION'
             )),
  details    TEXT         NOT NULL DEFAULT '',
  timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEX POUR LES PERFORMANCES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_members_group_name   ON members(group_name);
CREATE INDEX IF NOT EXISTS idx_members_commune       ON members(commune);
CREATE INDEX IF NOT EXISTS idx_members_reseau        ON members(reseau);
CREATE INDEX IF NOT EXISTS idx_members_created_by    ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_members_deleted       ON members(deleted);
CREATE INDEX IF NOT EXISTS idx_groups_created_by     ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_deleted        ON groups(deleted);
CREATE INDEX IF NOT EXISTS idx_networks_created_by   ON networks(created_by);
CREATE INDEX IF NOT EXISTS idx_networks_deleted      ON networks(deleted);
CREATE INDEX IF NOT EXISTS idx_activity_user_id      ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action       ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp    ON activity_logs(timestamp DESC);

-- =============================================================================
-- TRIGGER : updated_at automatique
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_networks_updated_at
  BEFORE UPDATE ON networks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED : Administrateur système initial
-- =============================================================================
-- Mot de passe : Admin@1234 (bcrypt hash)
-- IMPORTANT : Changer ce mot de passe dès la première connexion !
INSERT INTO users (nom, prenom, username, email, telephone, password_hash, role_applicatif, actif, fonction, commune)
VALUES (
  'Administrateur',
  'Système',
  'admin',
  'admin@tsinjoaina.org',
  '',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password" en bcrypt (DEV ONLY)
  'ADMINISTRATEUR_SYSTEME',
  TRUE,
  'Administrateur Système',
  'Antananarivo'
)
ON CONFLICT (username) DO NOTHING;
