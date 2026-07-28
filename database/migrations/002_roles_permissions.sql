-- =============================================================================
-- Migration 002 : Rôles & Permissions
-- =============================================================================
--
-- Ordre d'exécution : 2ème (après 001_initial_schema.sql)
-- Dépendances      : 001_initial_schema.sql (fonction set_updated_at)
--
-- Contenu :
--   - TABLE roles          : rôles applicatifs hiérarchiques
--   - TABLE permissions    : actions granulaires (resource:action)
--   - TABLE role_permissions : table de jonction N×N
--   - Données initiales    : 4 rôles + 31 permissions + attributions
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI (CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE : roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL       PRIMARY KEY,
  code        VARCHAR(60)  NOT NULL UNIQUE,      -- ex: 'ADMINISTRATEUR_SYSTEME'
  label       VARCHAR(120) NOT NULL,             -- ex: 'Administrateur Système'
  description TEXT         NOT NULL DEFAULT '',
  level       INTEGER      NOT NULL DEFAULT 1    -- hiérarchie : + élevé = + de droits
                           CHECK (level >= 1),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_roles_updated_at'
  ) THEN
    CREATE TRIGGER trg_roles_updated_at
      BEFORE UPDATE ON roles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- Index
CREATE INDEX IF NOT EXISTS idx_roles_code  ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);


-- ---------------------------------------------------------------------------
-- TABLE : permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL       PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,  -- ex: 'members:create', 'users:delete'
  label       VARCHAR(150) NOT NULL,
  resource    VARCHAR(60)  NOT NULL,         -- ex: 'members', 'users', 'reports'
  action      VARCHAR(60)  NOT NULL,         -- ex: 'create', 'read', 'update', 'delete'
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action   ON permissions(action);


-- ---------------------------------------------------------------------------
-- TABLE : role_permissions (N×N)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Index sur permission_id pour les lookups inverses
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions(permission_id);


-- ---------------------------------------------------------------------------
-- DONNÉES INITIALES : 4 rôles applicatifs
-- ---------------------------------------------------------------------------
INSERT INTO roles (code, label, description, level) VALUES
  ('CONSULTATION',
   'Consultation',
   'Lecture seule de toutes les données',
   1),
  ('SAISIE',
   'Saisie',
   'Création et modification de ses propres données',
   2),
  ('VALIDATION',
   'Validation',
   'Lecture, modification et validation globales',
   3),
  ('ADMINISTRATEUR_SYSTEME',
   'Administrateur Système',
   'Accès total — gestion des utilisateurs et logs',
   4)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- DONNÉES INITIALES : 31 permissions granulaires
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, label, resource, action) VALUES
  -- Membres
  ('members:read',         'Lire les membres',              'members',       'read'),
  ('members:create',       'Créer un membre',               'members',       'create'),
  ('members:update',       'Modifier un membre',            'members',       'update'),
  ('members:delete',       'Supprimer un membre',           'members',       'delete'),
  ('members:restore',      'Restaurer un membre',           'members',       'restore'),
  ('members:delete_perm',  'Suppression définitive membre', 'members',       'delete_perm'),
  -- Groupes
  ('groups:read',          'Lire les groupes',              'groups',        'read'),
  ('groups:create',        'Créer un groupe',               'groups',        'create'),
  ('groups:update',        'Modifier un groupe',            'groups',        'update'),
  ('groups:delete',        'Supprimer un groupe',           'groups',        'delete'),
  ('groups:restore',       'Restaurer un groupe',           'groups',        'restore'),
  ('groups:delete_perm',   'Suppression définitive groupe', 'groups',        'delete_perm'),
  -- Réseaux
  ('networks:read',        'Lire les réseaux',              'networks',      'read'),
  ('networks:create',      'Créer un réseau',               'networks',      'create'),
  ('networks:update',      'Modifier un réseau',            'networks',      'update'),
  ('networks:delete',      'Supprimer un réseau',           'networks',      'delete'),
  ('networks:restore',     'Restaurer un réseau',           'networks',      'restore'),
  ('networks:delete_perm', 'Suppression définitive réseau', 'networks',      'delete_perm'),
  -- Utilisateurs
  ('users:read',           'Lire les utilisateurs',         'users',         'read'),
  ('users:create',         'Créer un utilisateur',          'users',         'create'),
  ('users:update',         'Modifier un utilisateur',       'users',         'update'),
  ('users:delete',         'Supprimer un utilisateur',      'users',         'delete'),
  ('users:restore',        'Restaurer un utilisateur',      'users',         'restore'),
  ('users:toggle_actif',   'Activer / désactiver un compte','users',         'toggle_actif'),
  -- Journal d'audit
  ('activity:read',        'Lire le journal d''audit',      'activity',      'read'),
  ('activity:clear',       'Vider le journal d''audit',     'activity',      'clear'),
  -- Rapports
  ('reports:read',         'Consulter les rapports',        'reports',       'read'),
  ('reports:generate',     'Générer un rapport',            'reports',       'generate'),
  ('reports:export',       'Exporter un rapport',           'reports',       'export'),
  -- Corbeille
  ('trash:read',           'Voir la corbeille',             'trash',         'read'),
  ('trash:restore',        'Restaurer depuis la corbeille', 'trash',         'restore'),
  ('trash:delete_perm',    'Vider la corbeille',            'trash',         'delete_perm'),
  -- Notifications
  ('notifications:read',   'Lire les notifications',        'notifications', 'read'),
  ('notifications:manage', 'Gérer les notifications',       'notifications', 'manage')
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- DONNÉES INITIALES : Attributions rôle → permissions
-- ---------------------------------------------------------------------------

-- CONSULTATION : lecture seule
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM   roles r
  CROSS JOIN permissions p
  WHERE  r.code = 'CONSULTATION'
    AND  p.action = 'read'
ON CONFLICT DO NOTHING;

-- SAISIE : lecture + CRUD limité + soft delete/restore sur données opérationnelles
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM   roles r
  CROSS JOIN permissions p
  WHERE  r.code = 'SAISIE'
    AND  p.action     IN ('read', 'create', 'update', 'delete', 'restore')
    AND  p.resource   IN ('members', 'groups', 'networks', 'reports', 'notifications')
ON CONFLICT DO NOTHING;

-- VALIDATION : tout sauf administration users et vidage journal/corbeille
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM   roles r
  CROSS JOIN permissions p
  WHERE  r.code = 'VALIDATION'
    AND  p.code NOT IN (
      'users:create',
      'users:delete',
      'users:restore',
      'users:toggle_actif',
      'activity:clear',
      'trash:delete_perm'
    )
ON CONFLICT DO NOTHING;

-- ADMINISTRATEUR_SYSTEME : toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM   roles r
  CROSS JOIN permissions p
  WHERE  r.code = 'ADMINISTRATEUR_SYSTEME'
ON CONFLICT DO NOTHING;


COMMIT;

-- =============================================================================
-- Fin de la migration 002
-- Prochaine étape : exécuter 003_members_groups.sql
-- =============================================================================
