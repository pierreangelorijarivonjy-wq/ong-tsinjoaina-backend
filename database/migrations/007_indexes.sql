-- =============================================================================
-- Migration 007 : Index de performance
-- =============================================================================
--
-- Ordre d'exécution : 7ème et DERNIER (après toutes les tables créées)
-- Dépendances      :
--   - 003_members_groups.sql  (users, groups, networks, members, formations)
--   - 004_notifications.sql   (notifications)
--   - 005_activity_logs.sql   (activity_logs, reports)
--
-- Contenu :
--   - Index B-Tree standards pour les colonnes de filtrage fréquent
--   - Index GIN trigrammes (pg_trgm) pour la recherche textuelle sur members
--   - Index GIN JSONB pour les champs gs_members (networks) et filters (reports)
--   - Index partiels sur les colonnes booléennes (actif, deleted, is_read)
--   - Tous les index sont déclarés IF NOT EXISTS
--
-- Stratégie d'indexation :
--   Priorité 1 - Critères WHERE les plus fréquents (deleted, actif, is_read)
--   Priorité 2 - Colonnes de jointure (created_by, user_id, member_id, role_id)
--   Priorité 3 - Colonnes de tri (timestamp DESC, created_at DESC, generated_at DESC)
--   Priorité 4 - Recherche full-text et JSONB
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI (CREATE INDEX IF NOT EXISTS)
-- =============================================================================

BEGIN;

-- ===========================================================================
-- TABLE : users
-- ===========================================================================

-- Filtrage par rôle (liste des utilisateurs par rôle, guards middleware)
CREATE INDEX IF NOT EXISTS idx_users_role_applicatif
  ON users(role_applicatif);

-- Filtrage par statut actif
CREATE INDEX IF NOT EXISTS idx_users_actif
  ON users(actif)
  WHERE actif = TRUE;   -- Index partiel : seuls les users actifs (cas fréquent)

-- Soft delete (WHERE deleted = FALSE sur toutes les requêtes)
CREATE INDEX IF NOT EXISTS idx_users_deleted
  ON users(deleted)
  WHERE deleted = FALSE;

-- Filtrage géographique
CREATE INDEX IF NOT EXISTS idx_users_commune
  ON users(commune);

-- FK vers roles (jointure v_membres avec rôles)
CREATE INDEX IF NOT EXISTS idx_users_role_id
  ON users(role_id);

-- Tri par date de création (liste des utilisateurs)
CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at DESC);


-- ===========================================================================
-- TABLE : groups
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_groups_village
  ON groups(village);

CREATE INDEX IF NOT EXISTS idx_groups_fokontany
  ON groups(fokontany);

CREATE INDEX IF NOT EXISTS idx_groups_commune
  ON groups(commune);

-- FK audit
CREATE INDEX IF NOT EXISTS idx_groups_created_by
  ON groups(created_by);

-- Soft delete partiel
CREATE INDEX IF NOT EXISTS idx_groups_deleted
  ON groups(deleted)
  WHERE deleted = FALSE;

-- Tri
CREATE INDEX IF NOT EXISTS idx_groups_created_at
  ON groups(created_at DESC);


-- ===========================================================================
-- TABLE : networks
-- ===========================================================================

-- Filtrage réseau autonome (statistiques dashboard)
CREATE INDEX IF NOT EXISTS idx_networks_autonome
  ON networks(autonome)
  WHERE autonome = TRUE;

-- FK audit
CREATE INDEX IF NOT EXISTS idx_networks_created_by
  ON networks(created_by);

-- Soft delete partiel
CREATE INDEX IF NOT EXISTS idx_networks_deleted
  ON networks(deleted)
  WHERE deleted = FALSE;

-- Recherche dans le tableau JSONB des groupes membres
CREATE INDEX IF NOT EXISTS idx_networks_gs_members
  ON networks USING GIN(gs_members);

-- Tri
CREATE INDEX IF NOT EXISTS idx_networks_created_at
  ON networks(created_at DESC);


-- ===========================================================================
-- TABLE : members
-- ===========================================================================

-- Recherche full-text par nom (trigrammes — nécessite pg_trgm de la migration 001)
CREATE INDEX IF NOT EXISTS idx_members_name_trgm
  ON members USING GIN(name gin_trgm_ops);

-- Appartenance à un groupe (recherche par groupe)
CREATE INDEX IF NOT EXISTS idx_members_group_name
  ON members(group_name);

-- Localisation
CREATE INDEX IF NOT EXISTS idx_members_commune
  ON members(commune);

CREATE INDEX IF NOT EXISTS idx_members_fokontany
  ON members(fokontany);

-- Appartenance réseau
CREATE INDEX IF NOT EXISTS idx_members_reseau
  ON members(reseau);

-- Statistiques démographiques
CREATE INDEX IF NOT EXISTS idx_members_sexe
  ON members(sexe);

CREATE INDEX IF NOT EXISTS idx_members_age
  ON members(age);

-- FK audit
CREATE INDEX IF NOT EXISTS idx_members_created_by
  ON members(created_by);

-- Soft delete partiel
CREATE INDEX IF NOT EXISTS idx_members_deleted
  ON members(deleted)
  WHERE deleted = FALSE;

-- Tri
CREATE INDEX IF NOT EXISTS idx_members_created_at
  ON members(created_at DESC);

-- Index composite : recherche membres actifs d'un groupe (requête très fréquente)
CREATE INDEX IF NOT EXISTS idx_members_group_active
  ON members(group_name, deleted)
  WHERE deleted = FALSE;


-- ===========================================================================
-- TABLE : formations
-- ===========================================================================

-- FK principale (jointure avec members)
CREATE INDEX IF NOT EXISTS idx_formations_member_id
  ON formations(member_id);

-- Filtrage par thématique (statistiques de formation)
CREATE INDEX IF NOT EXISTS idx_formations_agroecologie
  ON formations(agroecologie)
  WHERE agroecologie = TRUE;

CREATE INDEX IF NOT EXISTS idx_formations_nutrition
  ON formations(nutrition)
  WHERE nutrition = TRUE;

CREATE INDEX IF NOT EXISTS idx_formations_genre
  ON formations(genre)
  WHERE genre = TRUE;


-- ===========================================================================
-- TABLE : notifications
-- ===========================================================================

-- Notifications d'un utilisateur (requête principale)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

-- Notifications non lues (badge compteur)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- Filtrage par type
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications(type);

-- Tri chronologique (flux de notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);

-- Notifications non expirées
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at
  ON notifications(expires_at)
  WHERE expires_at IS NOT NULL;


-- ===========================================================================
-- TABLE : activity_logs
-- ===========================================================================

-- Filtrage par utilisateur (journal personnel)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON activity_logs(user_id);

-- Filtrage par type d'action
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON activity_logs(action);

-- Filtrage par ressource
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource
  ON activity_logs(resource);

-- Tri chronologique DESC (affichage journal — ordre le plus récent en premier)
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp
  ON activity_logs(timestamp DESC);

-- Index composite : historique d'une ressource spécifique
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id
  ON activity_logs(resource, resource_id)
  WHERE resource_id IS NOT NULL;


-- ===========================================================================
-- TABLE : reports
-- ===========================================================================

-- Filtrage par type de rapport
CREATE INDEX IF NOT EXISTS idx_reports_type
  ON reports(type);

-- Générés par un utilisateur
CREATE INDEX IF NOT EXISTS idx_reports_generated_by
  ON reports(generated_by);

-- Tri chronologique DESC
CREATE INDEX IF NOT EXISTS idx_reports_generated_at
  ON reports(generated_at DESC);

-- Filtrage par statut
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports(status);

-- Recherche dans les filtres JSON
CREATE INDEX IF NOT EXISTS idx_reports_filters
  ON reports USING GIN(filters);


-- ===========================================================================
-- TABLE : role_permissions (déjà indexée en migration 002 — vérification)
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
  ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_perm_id
  ON role_permissions(permission_id);


COMMIT;

-- =============================================================================
-- Fin de la migration 007 — DERNIÈRE MIGRATION
-- Toutes les tables, vues, triggers et index ont été créés.
--
-- Pour vérifier l'état de la base :
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
--   SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1;
-- =============================================================================
