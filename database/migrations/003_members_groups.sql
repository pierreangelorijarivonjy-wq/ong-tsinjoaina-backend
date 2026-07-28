-- =============================================================================
-- Migration 003 : Membres & Groupes de Solidarité
-- =============================================================================
--
-- Ordre d'exécution : 3ème (après 002_roles_permissions.sql)
-- Dépendances      :
--   - 001_initial_schema.sql  (set_updated_at, extensions)
--   - 002_roles_permissions.sql (table roles)
--
-- Contenu :
--   - TABLE users      : comptes applicatifs (agents, admin)
--   - TABLE groups     : Groupes de Solidarité (GS)
--   - TABLE networks   : Réseaux de Solidarité (fédère des GS)
--   - TABLE members    : membres individuels des GS
--   - TABLE formations : formations reçues (1-to-1 avec members)
--   - VUES             : v_members_full, v_dashboard_stats
--   - Données          : admin système initial
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE : users
-- Utilisateurs de l'application (agents de terrain, chefs de projet, admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL       PRIMARY KEY,
  nom              VARCHAR(100) NOT NULL,
  prenom           VARCHAR(100) NOT NULL,
  username         VARCHAR(50)  NOT NULL UNIQUE,
  email            VARCHAR(150) NOT NULL UNIQUE,
  telephone        VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash    VARCHAR(255) NOT NULL,

  -- Rôle applicatif (dénormalisé pour les requêtes rapides)
  role_applicatif  VARCHAR(60)  NOT NULL DEFAULT 'CONSULTATION'
                   CHECK (role_applicatif IN (
                     'ADMINISTRATEUR_SYSTEME',
                     'VALIDATION',
                     'SAISIE',
                     'CONSULTATION'
                   )),

  -- FK vers la table roles (normalisée)
  role_id          INTEGER REFERENCES roles(id) ON DELETE SET NULL,

  actif            BOOLEAN      NOT NULL DEFAULT TRUE,
  fonction         VARCHAR(100) NOT NULL DEFAULT '',
  commune          VARCHAR(100) NOT NULL DEFAULT '',

  -- Audit
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  deleted_by       INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- TABLE : groups (Groupes de Solidarité)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id            SERIAL       PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,
  village       VARCHAR(100) NOT NULL DEFAULT '',
  fokontany     VARCHAR(100) NOT NULL DEFAULT '',
  commune       VARCHAR(100) NOT NULL DEFAULT '',

  -- Statistiques dénormalisées (recalculées via trigger ou service)
  members_count INTEGER      NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  femmes_count  INTEGER      NOT NULL DEFAULT 0 CHECK (femmes_count  >= 0),
  hommes_count  INTEGER      NOT NULL DEFAULT 0 CHECK (hommes_count  >= 0),
  menages_count INTEGER      NOT NULL DEFAULT 0 CHECK (menages_count >= 0),

  -- Audit
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  deleted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_groups_updated_at'
  ) THEN
    CREATE TRIGGER trg_groups_updated_at
      BEFORE UPDATE ON groups
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- TABLE : networks (Réseaux de Solidarité)
-- Un réseau fédère plusieurs Groupes de Solidarité
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS networks (
  id            SERIAL       PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,

  -- Liste des noms de groupes membres (JSONB pour flexibilité)
  gs_members    JSONB        NOT NULL DEFAULT '[]',

  -- Statistiques agrégées
  femmes_count  INTEGER      NOT NULL DEFAULT 0 CHECK (femmes_count  >= 0),
  hommes_count  INTEGER      NOT NULL DEFAULT 0 CHECK (hommes_count  >= 0),
  menages_count INTEGER      NOT NULL DEFAULT 0 CHECK (menages_count >= 0),

  -- Activités du réseau
  dev_activity  BOOLEAN      NOT NULL DEFAULT FALSE,
  plaidoyer     BOOLEAN      NOT NULL DEFAULT FALSE,
  dev_plan      BOOLEAN      NOT NULL DEFAULT FALSE,
  autonome      BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Audit
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  deleted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_networks_updated_at'
  ) THEN
    CREATE TRIGGER trg_networks_updated_at
      BEFORE UPDATE ON networks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- TABLE : members (Membres individuels des Groupes de Solidarité)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                  SERIAL       PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  chef_menage         VARCHAR(200) NOT NULL DEFAULT '',
  no_menage           VARCHAR(50)  NOT NULL DEFAULT '',

  -- Appartenance au groupe (dénormalisée pour rapidité des rapports)
  group_name          VARCHAR(200) NOT NULL DEFAULT '',
  group_creation_date VARCHAR(50)  NOT NULL DEFAULT '',

  -- Localisation
  village             VARCHAR(100) NOT NULL DEFAULT '',
  fokontany           VARCHAR(100) NOT NULL DEFAULT '',
  commune             VARCHAR(100) NOT NULL DEFAULT '',

  -- Données personnelles
  age                 INTEGER      NOT NULL DEFAULT 0
                      CHECK (age >= 0 AND age <= 150),
  sexe                CHAR(1)      NOT NULL CHECK (sexe IN ('M', 'F')),
  responsabilite      VARCHAR(100) NOT NULL DEFAULT '',
  reseau              VARCHAR(200) NOT NULL DEFAULT '',
  autonome            BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Audit
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted             BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_members_updated_at'
  ) THEN
    CREATE TRIGGER trg_members_updated_at
      BEFORE UPDATE ON members
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- TABLE : formations (1-to-1 avec members — CASCADE sur suppression)
-- Thématiques de formation reçues par chaque membre
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formations (
  id                       SERIAL   PRIMARY KEY,
  member_id                INTEGER  NOT NULL
                           REFERENCES members(id) ON DELETE CASCADE
                           UNIQUE,  -- 1 fiche de formation par membre

  -- Thématiques booléennes
  gestion_simplifiee       BOOLEAN  NOT NULL DEFAULT FALSE,
  eau                      BOOLEAN  NOT NULL DEFAULT FALSE,
  sol                      BOOLEAN  NOT NULL DEFAULT FALSE,
  vegetaux                 BOOLEAN  NOT NULL DEFAULT FALSE,
  agroecologie             BOOLEAN  NOT NULL DEFAULT FALSE,
  production_semences      BOOLEAN  NOT NULL DEFAULT FALSE,
  alimentation_saine       BOOLEAN  NOT NULL DEFAULT FALSE,
  eah                      BOOLEAN  NOT NULL DEFAULT FALSE,
  nutrition                BOOLEAN  NOT NULL DEFAULT FALSE,
  conservation_produits    BOOLEAN  NOT NULL DEFAULT FALSE,
  transformation_produits  BOOLEAN  NOT NULL DEFAULT FALSE,
  genre                    BOOLEAN  NOT NULL DEFAULT FALSE,
  epracc                   BOOLEAN  NOT NULL DEFAULT FALSE,
  autre                    TEXT     NOT NULL DEFAULT '',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_formations_updated_at'
  ) THEN
    CREATE TRIGGER trg_formations_updated_at
      BEFORE UPDATE ON formations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- VUE : v_members_full (membres avec leurs formations — LEFT JOIN optimisé)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_members_full AS
  SELECT
    m.*,
    -- Formations individuelles
    f.gestion_simplifiee,
    f.eau,
    f.sol,
    f.vegetaux,
    f.agroecologie,
    f.production_semences,
    f.alimentation_saine,
    f.eah,
    f.nutrition,
    f.conservation_produits,
    f.transformation_produits,
    f.genre,
    f.epracc,
    f.autre
  FROM members m
  LEFT JOIN formations f ON f.member_id = m.id;


-- ---------------------------------------------------------------------------
-- VUE : v_dashboard_stats (compteurs pour le tableau de bord)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard_stats AS
  SELECT
    (SELECT COUNT(*) FROM members  WHERE deleted = FALSE)              AS total_members,
    (SELECT COUNT(*) FROM members  WHERE deleted = FALSE AND sexe='F') AS femmes,
    (SELECT COUNT(*) FROM members  WHERE deleted = FALSE AND sexe='M') AS hommes,
    (SELECT COUNT(*) FROM groups   WHERE deleted = FALSE)              AS total_groups,
    (SELECT COUNT(*) FROM networks WHERE deleted = FALSE)              AS total_networks,
    (SELECT COUNT(*) FROM users    WHERE deleted = FALSE AND actif=TRUE) AS agents_actifs,
    (SELECT COUNT(*) FROM members  WHERE deleted = TRUE)               AS trash_members,
    (SELECT COUNT(*) FROM groups   WHERE deleted = TRUE)               AS trash_groups,
    (SELECT COUNT(*) FROM networks WHERE deleted = TRUE)               AS trash_networks;


-- ---------------------------------------------------------------------------
-- Données initiales : administrateur système
-- ---------------------------------------------------------------------------
-- Mot de passe de démonstration : Admin@1234
-- Hash bcrypt (rounds=10) — OBLIGATOIREMENT remplacé en production
INSERT INTO users (
  nom, prenom, username, email, telephone,
  password_hash, role_applicatif, actif, fonction, commune
) VALUES (
  'Administrateur',
  'Système',
  'admin',
  'admin@tsinjoaina.org',
  '',
  '$2b$10$YWRtaW5AcGFzc3dvcmQ.JtVQhbWv.2AqwKqvHzAPQuvgv/XKDxKOy',
  'ADMINISTRATEUR_SYSTEME',
  TRUE,
  'Administrateur Système',
  'Antananarivo'
) ON CONFLICT (username) DO NOTHING;

-- Lier l'admin au rôle ADMINISTRATEUR_SYSTEME
UPDATE users u
SET    role_id = (SELECT id FROM roles WHERE code = 'ADMINISTRATEUR_SYSTEME')
WHERE  u.username = 'admin'
  AND  u.role_id IS NULL;


COMMIT;

-- =============================================================================
-- Fin de la migration 003
-- Prochaine étape : exécuter 004_notifications.sql
-- =============================================================================
