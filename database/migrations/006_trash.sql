-- =============================================================================
-- Migration 006 : Corbeille (Vue unifiée v_trash)
-- =============================================================================
--
-- Ordre d'exécution : 6ème (après 005_activity_logs.sql)
-- Dépendances      :
--   - 003_members_groups.sql (tables members, groups, networks, users)
--
-- Contenu :
--   - VUE v_trash : agrège tous les éléments soft-deleted en lecture seule
--     → Simplifie l'API de la corbeille (un seul endpoint pour tout)
--
-- Notes de conception :
--   - La corbeille est une VUE, pas une table — aucune donnée dupliquée
--   - La restauration = UPDATE deleted=FALSE sur la table source
--   - La suppression définitive = DELETE sur la table source
--   - Le champ "type" permet au frontend de router vers la bonne entité
--
-- Compatible : PostgreSQL 14+ | Supabase | Neon
-- Idempotent : OUI (CREATE OR REPLACE VIEW)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- VUE : v_trash (Corbeille unifiée — lecture seule)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_trash AS

  -- Membres supprimés
  SELECT
    'member'               AS type,
    CAST(m.id AS TEXT)     AS id,
    m.name                 AS display_name,
    m.deleted_at,
    m.deleted_by,
    m.created_by
  FROM members m
  WHERE m.deleted = TRUE

  UNION ALL

  -- Groupes supprimés
  SELECT
    'group'                AS type,
    CAST(g.id AS TEXT)     AS id,
    g.name                 AS display_name,
    g.deleted_at,
    g.deleted_by,
    g.created_by
  FROM groups g
  WHERE g.deleted = TRUE

  UNION ALL

  -- Réseaux supprimés
  SELECT
    'network'              AS type,
    CAST(n.id AS TEXT)     AS id,
    n.name                 AS display_name,
    n.deleted_at,
    n.deleted_by,
    n.created_by
  FROM networks n
  WHERE n.deleted = TRUE

  UNION ALL

  -- Utilisateurs supprimés
  SELECT
    'user'                 AS type,
    CAST(u.id AS TEXT)     AS id,
    CONCAT(u.prenom, ' ', u.nom, ' (@', u.username, ')') AS display_name,
    u.deleted_at,
    u.deleted_by,
    NULL::INTEGER          AS created_by   -- users n'ont pas de created_by
  FROM users u
  WHERE u.deleted = TRUE;

-- Commentaire de vue
COMMENT ON VIEW v_trash IS
  'Vue unifiée de la corbeille. Agrège members, groups, networks, users soft-deleted. Lecture seule.';


COMMIT;

-- =============================================================================
-- Fin de la migration 006
-- Prochaine étape : exécuter 007_indexes.sql
-- =============================================================================
