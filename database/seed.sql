-- =============================================================================
-- seed.sql — Données initiales de Tsinjo Aina ONG
-- =============================================================================
--
-- Ce fichier insère :
--   1. Les rôles et permissions
--   2. L'administrateur système initial
--   3. Des données de démonstration (membres, groupes, réseaux)
--
-- EXÉCUTER APRÈS schema.sql
-- IMPORTANT : Changer le mot de passe admin dès la première connexion !
--
-- Mot de passe de démonstration : Admin@1234
-- Hash bcrypt ($2b$10$...)  — NE PAS UTILISER EN PRODUCTION
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RÔLES
-- ---------------------------------------------------------------------------
INSERT INTO roles (code, label, description, level) VALUES
  ('CONSULTATION',           'Consultation',           'Lecture seule de toutes les données',             1),
  ('SAISIE',                 'Saisie',                 'Création et modification de ses propres données', 2),
  ('VALIDATION',             'Validation',             'Lecture, modification et validation globales',    3),
  ('ADMINISTRATEUR_SYSTEME', 'Administrateur Système', 'Accès total — gestion des utilisateurs et logs', 4)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. PERMISSIONS GRANULAIRES
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, label, resource, action) VALUES
  -- Membres
  ('members:read',           'Lire les membres',             'members',  'read'),
  ('members:create',         'Créer un membre',              'members',  'create'),
  ('members:update',         'Modifier un membre',           'members',  'update'),
  ('members:delete',         'Supprimer un membre',          'members',  'delete'),
  ('members:restore',        'Restaurer un membre',          'members',  'restore'),
  ('members:delete_perm',    'Suppression définitive membre','members',  'delete_perm'),
  -- Groupes
  ('groups:read',            'Lire les groupes',             'groups',   'read'),
  ('groups:create',          'Créer un groupe',              'groups',   'create'),
  ('groups:update',          'Modifier un groupe',           'groups',   'update'),
  ('groups:delete',          'Supprimer un groupe',          'groups',   'delete'),
  ('groups:restore',         'Restaurer un groupe',          'groups',   'restore'),
  ('groups:delete_perm',     'Suppression définitive groupe','groups',   'delete_perm'),
  -- Réseaux
  ('networks:read',          'Lire les réseaux',             'networks', 'read'),
  ('networks:create',        'Créer un réseau',              'networks', 'create'),
  ('networks:update',        'Modifier un réseau',           'networks', 'update'),
  ('networks:delete',        'Supprimer un réseau',          'networks', 'delete'),
  ('networks:restore',       'Restaurer un réseau',          'networks', 'restore'),
  ('networks:delete_perm',   'Suppression définitive réseau','networks', 'delete_perm'),
  -- Utilisateurs
  ('users:read',             'Lire les utilisateurs',        'users',    'read'),
  ('users:create',           'Créer un utilisateur',         'users',    'create'),
  ('users:update',           'Modifier un utilisateur',      'users',    'update'),
  ('users:delete',           'Supprimer un utilisateur',     'users',    'delete'),
  ('users:restore',          'Restaurer un utilisateur',     'users',    'restore'),
  ('users:toggle_actif',     'Activer / désactiver compte',  'users',    'toggle_actif'),
  -- Journal
  ('activity:read',          'Lire le journal',              'activity', 'read'),
  ('activity:clear',         'Vider le journal',             'activity', 'clear'),
  -- Rapports
  ('reports:read',           'Consulter les rapports',       'reports',  'read'),
  ('reports:generate',       'Générer un rapport',           'reports',  'generate'),
  ('reports:export',         'Exporter un rapport',          'reports',  'export'),
  -- Corbeille
  ('trash:read',             'Voir la corbeille',            'trash',    'read'),
  ('trash:restore',          'Restaurer depuis corbeille',   'trash',    'restore'),
  ('trash:delete_perm',      'Vider la corbeille',           'trash',    'delete_perm'),
  -- Notifications
  ('notifications:read',     'Lire les notifications',       'notifications', 'read'),
  ('notifications:manage',   'Gérer les notifications',      'notifications', 'manage')
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. ATTRIBUTION DES PERMISSIONS PAR RÔLE
-- ---------------------------------------------------------------------------

-- CONSULTATION : lecture seule de tout
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.code = 'CONSULTATION'
    AND p.action IN ('read')
ON CONFLICT DO NOTHING;

-- SAISIE : lecture + création + modification + soft delete (ses données)
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.code = 'SAISIE'
    AND p.action IN ('read', 'create', 'update', 'delete', 'restore')
    AND p.resource IN ('members', 'groups', 'networks', 'reports', 'notifications')
ON CONFLICT DO NOTHING;

-- VALIDATION : tout sauf users admin et vider journal
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.code = 'VALIDATION'
    AND p.code NOT IN (
      'users:create', 'users:delete', 'users:restore', 'users:toggle_actif',
      'activity:clear',
      'trash:delete_perm'
    )
ON CONFLICT DO NOTHING;

-- ADMINISTRATEUR_SYSTEME : tout
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.code = 'ADMINISTRATEUR_SYSTEME'
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4. ADMINISTRATEUR SYSTÈME INITIAL
-- ---------------------------------------------------------------------------
-- Mot de passe : Admin@1234
-- Hash bcrypt généré avec bcryptjs (rounds=10) — CHANGER EN PRODUCTION
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
SET role_id = (SELECT id FROM roles WHERE code = 'ADMINISTRATEUR_SYSTEME')
WHERE u.username = 'admin'
  AND u.role_id IS NULL;


-- ---------------------------------------------------------------------------
-- 5. DONNÉES DE DÉMONSTRATION
--    Commentées par défaut — décommenter pour un environnement de DEV
-- ---------------------------------------------------------------------------

/*

-- Utilisateurs de démonstration
INSERT INTO users (nom, prenom, username, email, password_hash, role_applicatif, actif, fonction, commune) VALUES
  ('Rakoto',   'Jean',   'jrakoto',   'jrakoto@tsinjoaina.org',   '$2b$10$KIXGpxdemopassword.KIXGpxdemo', 'SAISIE',      TRUE, 'Agent de Terrain',   'Fianarantsoa'),
  ('Raivo',    'Marie',  'mraivo',    'mraivo@tsinjoaina.org',    '$2b$10$KIXGpxdemopassword.KIXGpxdemo', 'VALIDATION',  TRUE, 'Chef de Projet',     'Antananarivo'),
  ('Rasoa',    'Claire', 'crasoa',    'crasoa@tsinjoaina.org',    '$2b$10$KIXGpxdemopassword.KIXGpxdemo', 'CONSULTATION',TRUE, 'Observateur',        'Toamasina')
ON CONFLICT (username) DO NOTHING;

-- Groupes de démonstration
INSERT INTO groups (name, village, fokontany, commune, members_count, femmes_count, hommes_count, menages_count) VALUES
  ('Fiarovana Mandroso',  'Ivoloina',  'Ampasimbe',  'Toamasina',       15, 10, 5, 10),
  ('Miray Havanana',      'Ambohipo',  'Ankadifotsy', 'Antananarivo',   20, 14, 6, 14),
  ('Firaisankina Vao',    'Betafo',    'Alakamisy',  'Antsirabe',       12,  8, 4,  8)
ON CONFLICT (name) DO NOTHING;

-- Réseaux de démonstration
INSERT INTO networks (name, gs_members, femmes_count, hommes_count, menages_count, dev_activity, plaidoyer, dev_plan, autonome) VALUES
  ('Réseau Atsinanana', '["Fiarovana Mandroso"]', 10, 5, 10, TRUE,  FALSE, FALSE, FALSE),
  ('Réseau Analamanga', '["Miray Havanana", "Firaisankina Vao"]', 22, 10, 22, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

*/
