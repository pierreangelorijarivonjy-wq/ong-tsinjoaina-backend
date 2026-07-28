-- =============================================================================
-- schema.sql — Tsinjo Aina ONG — Base de données PostgreSQL
-- =============================================================================
--
-- Instructions Supabase :
--   1. Dashboard → SQL Editor → New query
--   2. Coller ce fichier entier et cliquer "Run"
--   3. Toutes les tables, index, triggers et contraintes seront créés
--
-- Ordre de création (respecter les dépendances FK) :
--   1. users
--   2. roles + permissions + role_permissions
--   3. groups (Groupes de Solidarité)
--   4. networks (Réseaux de Solidarité)
--   5. members + formations
--   6. activity_logs
--   7. notifications
--   8. reports
--
-- Auteur   : Tsinjo Aina ONG
-- Version  : 2.0.0
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID v4 pour les logs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Recherche full-text ILIKE efficace


-- =============================================================================
-- FONCTION UTILITAIRE : updated_at automatique
-- Déclarée en premier car utilisée par tous les triggers ci-dessous.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE : roles
-- Rôles applicatifs définis en base (extensible)
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL       PRIMARY KEY,
  code        VARCHAR(60)  NOT NULL UNIQUE,      -- ex: 'ADMINISTRATEUR_SYSTEME'
  label       VARCHAR(120) NOT NULL,             -- ex: 'Administrateur Système'
  description TEXT         NOT NULL DEFAULT '',
  level       INTEGER      NOT NULL DEFAULT 1,   -- hiérarchie : + élevé = + de droits
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- TABLE : permissions
-- Actions granulaires (resource:action)
-- =============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL       PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,  -- ex: 'members:create', 'users:delete'
  label       VARCHAR(150) NOT NULL,
  resource    VARCHAR(60)  NOT NULL,         -- ex: 'members', 'users', 'reports'
  action      VARCHAR(60)  NOT NULL,         -- ex: 'create', 'read', 'update', 'delete'
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- TABLE : role_permissions (N×N)
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);


-- =============================================================================
-- TABLE : users
-- Utilisateurs de l'application (agents de terrain, chefs de projet, admin)
-- =============================================================================
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

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index users
CREATE INDEX IF NOT EXISTS idx_users_role_applicatif ON users(role_applicatif);
CREATE INDEX IF NOT EXISTS idx_users_actif           ON users(actif);
CREATE INDEX IF NOT EXISTS idx_users_deleted         ON users(deleted);
CREATE INDEX IF NOT EXISTS idx_users_commune         ON users(commune);


-- =============================================================================
-- TABLE : groups (Groupes de Solidarité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS groups (
  id            SERIAL       PRIMARY KEY,
  name          VARCHAR(200) NOT NULL UNIQUE,
  village       VARCHAR(100) NOT NULL DEFAULT '',
  fokontany     VARCHAR(100) NOT NULL DEFAULT '',
  commune       VARCHAR(100) NOT NULL DEFAULT '',

  -- Statistiques du groupe (dénormalisées — recalculées via trigger ou service)
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

CREATE OR REPLACE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index groups
CREATE INDEX IF NOT EXISTS idx_groups_village    ON groups(village);
CREATE INDEX IF NOT EXISTS idx_groups_fokontany  ON groups(fokontany);
CREATE INDEX IF NOT EXISTS idx_groups_commune    ON groups(commune);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_deleted    ON groups(deleted);


-- =============================================================================
-- TABLE : networks (Réseaux de Solidarité)
-- Un réseau fédère plusieurs Groupes de Solidarité
-- =============================================================================
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

CREATE OR REPLACE TRIGGER trg_networks_updated_at
  BEFORE UPDATE ON networks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index networks
CREATE INDEX IF NOT EXISTS idx_networks_autonome    ON networks(autonome);
CREATE INDEX IF NOT EXISTS idx_networks_created_by  ON networks(created_by);
CREATE INDEX IF NOT EXISTS idx_networks_deleted     ON networks(deleted);
CREATE INDEX IF NOT EXISTS idx_networks_gs_members  ON networks USING GIN(gs_members);


-- =============================================================================
-- TABLE : members (Membres des Groupes de Solidarité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS members (
  id                  SERIAL       PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  chef_menage         VARCHAR(200) NOT NULL DEFAULT '',
  no_menage           VARCHAR(50)  NOT NULL DEFAULT '',

  -- Appartenance au groupe (dénormalisée pour les rapports)
  group_name          VARCHAR(200) NOT NULL DEFAULT '',
  group_creation_date VARCHAR(50)  NOT NULL DEFAULT '',

  -- Localisation
  village             VARCHAR(100) NOT NULL DEFAULT '',
  fokontany           VARCHAR(100) NOT NULL DEFAULT '',
  commune             VARCHAR(100) NOT NULL DEFAULT '',

  -- Données personnelles
  age                 INTEGER      NOT NULL DEFAULT 0 CHECK (age >= 0 AND age <= 150),
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

CREATE OR REPLACE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index members
CREATE INDEX IF NOT EXISTS idx_members_name        ON members USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_group_name  ON members(group_name);
CREATE INDEX IF NOT EXISTS idx_members_commune     ON members(commune);
CREATE INDEX IF NOT EXISTS idx_members_fokontany   ON members(fokontany);
CREATE INDEX IF NOT EXISTS idx_members_reseau      ON members(reseau);
CREATE INDEX IF NOT EXISTS idx_members_sexe        ON members(sexe);
CREATE INDEX IF NOT EXISTS idx_members_created_by  ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_members_deleted     ON members(deleted);


-- =============================================================================
-- TABLE : formations (liée à members — relation 1:1)
-- Formations reçues par chaque membre
-- =============================================================================
CREATE TABLE IF NOT EXISTS formations (
  id                       SERIAL   PRIMARY KEY,
  member_id                INTEGER  NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,

  -- Thématiques de formation (booléens)
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

CREATE OR REPLACE TRIGGER trg_formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_formations_member_id ON formations(member_id);


-- =============================================================================
-- TABLE : activity_logs (Journal d'audit complet)
-- Toutes les actions des utilisateurs sont tracées ici.
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  user_name  VARCHAR(200) NOT NULL DEFAULT '',
  user_role  VARCHAR(60)  NOT NULL DEFAULT '',

  action     VARCHAR(60)  NOT NULL
             CHECK (action IN (
               'LOGIN', 'LOGOUT',
               'CREATION', 'MODIFICATION', 'SUPPRESSION', 'RESTAURATION',
               'IMPORT', 'EXPORT', 'IMPRESSION',
               'CONSULTATION'
             )),

  -- Contexte de l'action
  resource   VARCHAR(60)  NOT NULL DEFAULT '',  -- ex: 'members', 'groups'
  resource_id TEXT        ,                     -- ID de la ressource concernée
  details    TEXT         NOT NULL DEFAULT '',

  -- Métadonnées techniques
  ip_address  INET,
  user_agent  TEXT,

  timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_user_id   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action    ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_resource  ON activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp DESC);


-- =============================================================================
-- TABLE : notifications
-- Notifications système pour les utilisateurs
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type        VARCHAR(50)  NOT NULL
              CHECK (type IN (
                'INFO', 'SUCCESS', 'WARNING', 'ERROR',
                'SYSTEM', 'PERMISSION_REQUEST'
              )),

  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL DEFAULT '',
  link        VARCHAR(500),            -- chemin interne vers la ressource concernée

  -- État
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,

  -- Expiration (optionnel)
  expires_at  TIMESTAMPTZ,

  -- Qui a émis cette notification
  sent_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type      ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);


-- =============================================================================
-- TABLE : reports (Rapports générés)
-- Historique des rapports demandés et/ou exportés
-- =============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(300) NOT NULL,

  type         VARCHAR(60)  NOT NULL
               CHECK (type IN (
                 'MEMBRES', 'GROUPES', 'RESEAUX', 'ACTIVITES',
                 'STATISTIQUES', 'EXPORT_CSV', 'IMPRESSION'
               )),

  -- Paramètres de filtrage au moment de la génération (stockage JSON)
  filters      JSONB        NOT NULL DEFAULT '{}',

  -- Résumé des résultats
  records_count INTEGER     NOT NULL DEFAULT 0,
  status        VARCHAR(30) NOT NULL DEFAULT 'GENERE'
                CHECK (status IN ('GENERE', 'EN_ATTENTE', 'ERREUR')),

  -- Qui a généré ce rapport
  generated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index reports
CREATE INDEX IF NOT EXISTS idx_reports_type         ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);


-- =============================================================================
-- VUE : v_trash (Corbeille unifiée — lecture seule)
-- Agrège tous les éléments soft-deleted de toutes les tables.
-- =============================================================================
CREATE OR REPLACE VIEW v_trash AS
  SELECT
    'member'               AS type,
    CAST(m.id AS TEXT)     AS id,
    m.name                 AS display_name,
    m.deleted_at,
    m.deleted_by,
    m.created_by
  FROM members m WHERE m.deleted = TRUE

  UNION ALL

  SELECT
    'group'                AS type,
    CAST(g.id AS TEXT)     AS id,
    g.name                 AS display_name,
    g.deleted_at,
    g.deleted_by,
    g.created_by
  FROM groups g WHERE g.deleted = TRUE

  UNION ALL

  SELECT
    'network'              AS type,
    CAST(n.id AS TEXT)     AS id,
    n.name                 AS display_name,
    n.deleted_at,
    n.deleted_by,
    n.created_by
  FROM networks n WHERE n.deleted = TRUE

  UNION ALL

  SELECT
    'user'                 AS type,
    CAST(u.id AS TEXT)     AS id,
    CONCAT(u.prenom, ' ', u.nom, ' (@', u.username, ')') AS display_name,
    u.deleted_at,
    u.deleted_by,
    NULL                   AS created_by
  FROM users u WHERE u.deleted = TRUE;


-- =============================================================================
-- VUE : v_members_full (Membres avec formations — JOIN optimisé)
-- =============================================================================
CREATE OR REPLACE VIEW v_members_full AS
  SELECT
    m.*,
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


-- =============================================================================
-- VUE : v_dashboard_stats (Statistiques pour le tableau de bord)
-- =============================================================================
CREATE OR REPLACE VIEW v_dashboard_stats AS
  SELECT
    (SELECT COUNT(*) FROM members   WHERE deleted = FALSE) AS total_members,
    (SELECT COUNT(*) FROM members   WHERE deleted = FALSE AND sexe = 'F') AS femmes,
    (SELECT COUNT(*) FROM members   WHERE deleted = FALSE AND sexe = 'M') AS hommes,
    (SELECT COUNT(*) FROM groups    WHERE deleted = FALSE) AS total_groups,
    (SELECT COUNT(*) FROM networks  WHERE deleted = FALSE) AS total_networks,
    (SELECT COUNT(*) FROM users     WHERE deleted = FALSE AND actif = TRUE) AS agents_actifs,
    (SELECT COUNT(*) FROM members   WHERE deleted = TRUE)  AS trash_members,
    (SELECT COUNT(*) FROM groups    WHERE deleted = TRUE)  AS trash_groups,
    (SELECT COUNT(*) FROM networks  WHERE deleted = TRUE)  AS trash_networks;
