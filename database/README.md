# Base de données — Tsinjo Aina ONG

Documentation complète du système de base de données PostgreSQL.

---

## Structure du répertoire

```
database/
├── schema.sql              ← Schéma complet (référence canonique)
├── seed.sql                ← Données initiales (rôles, admin, démo)
├── migrations/
│   ├── 001_initial_schema.sql    ← Extensions + fonction set_updated_at()
│   ├── 002_roles_permissions.sql ← Rôles, permissions, attributions
│   ├── 003_members_groups.sql    ← Users, groupes, réseaux, membres, formations
│   ├── 004_notifications.sql     ← Système de notifications
│   ├── 005_activity_logs.sql     ← Journal d'audit + rapports
│   ├── 006_trash.sql             ← Vue v_trash (corbeille unifiée)
│   └── 007_indexes.sql           ← Tous les index de performance
└── README.md               ← Ce fichier
```

---

## Ordre d'exécution obligatoire

> **CRITIQUE** — Les migrations doivent être exécutées dans cet ordre exact.  
> Chaque migration dépend des tables créées par les précédentes.

| Ordre | Fichier                      | Crée / Déclare                                               |
|------:|------------------------------|--------------------------------------------------------------|
|     1 | `001_initial_schema.sql`     | Extensions `uuid-ossp`, `pg_trgm`, fonction `set_updated_at` |
|     2 | `002_roles_permissions.sql`  | `roles`, `permissions`, `role_permissions` + données         |
|     3 | `003_members_groups.sql`     | `users`, `groups`, `networks`, `members`, `formations` + vues |
|     4 | `004_notifications.sql`      | `notifications`                                              |
|     5 | `005_activity_logs.sql`      | `activity_logs`, `reports`                                   |
|     6 | `006_trash.sql`              | Vue `v_trash`                                                |
|     7 | `007_indexes.sql`            | Tous les index de performance                                |

---

## Compatibilité

| Plateforme   | Statut     | Notes                                              |
|:-------------|:----------:|:---------------------------------------------------|
| Supabase     | ✅ Prêt    | Exécuter via SQL Editor (Dashboard)                |
| Neon         | ✅ Prêt    | Exécuter via Console SQL ou `psql`                 |
| PostgreSQL ≥ 14 | ✅ Prêt | Local ou serveur dédié                             |
| MySQL / SQLite | ❌ Non   | Syntaxe PostgreSQL spécifique (JSONB, UUID, etc.)  |

---

## Exécution

### Option A — Supabase (recommandée pour la production)

1. Aller dans **Dashboard → SQL Editor → New query**
2. Copier-coller chaque fichier dans l'ordre (001 → 007)
3. Cliquer **Run** après chaque fichier

> **Astuce Supabase** : vous pouvez enchaîner les 7 fichiers en un seul run  
> en les copiant à la suite dans l'éditeur.

### Option B — Neon

1. Aller dans **Console → SQL Editor**
2. Exécuter chaque fichier dans l'ordre
3. Ou utiliser l'URL de connexion avec `psql` (voir Option C)

### Option C — psql en ligne de commande

```bash
# Remplacer DATABASE_URL par votre chaîne de connexion
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Exécuter les migrations dans l'ordre
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/migrations/002_roles_permissions.sql
psql "$DATABASE_URL" -f database/migrations/003_members_groups.sql
psql "$DATABASE_URL" -f database/migrations/004_notifications.sql
psql "$DATABASE_URL" -f database/migrations/005_activity_logs.sql
psql "$DATABASE_URL" -f database/migrations/006_trash.sql
psql "$DATABASE_URL" -f database/migrations/007_indexes.sql
```

### Option D — Script bash automatisé

```bash
#!/bin/bash
# run_migrations.sh — Exécuter toutes les migrations

set -e  # Arrête le script si une migration échoue

DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/tsinjoaina}"

echo "→ Connexion à : $DATABASE_URL"

MIGRATIONS=(
  "001_initial_schema.sql"
  "002_roles_permissions.sql"
  "003_members_groups.sql"
  "004_notifications.sql"
  "005_activity_logs.sql"
  "006_trash.sql"
  "007_indexes.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  echo "⏳ Exécution : $migration"
  psql "$DATABASE_URL" -f "database/migrations/$migration"
  echo "✅ Terminé   : $migration"
done

echo ""
echo "🎉 Toutes les migrations ont été appliquées avec succès."
```

---

## Schéma des tables

### Hiérarchie des dépendances

```
001_initial_schema
    └── set_updated_at()
          ├── 002_roles_permissions
          │     └── roles, permissions, role_permissions
          └── 003_members_groups
                ├── users (→ roles FK)
                ├── groups (→ users FK)
                ├── networks (→ users FK)
                ├── members (→ users FK)
                └── formations (→ members FK)
                      ├── 004_notifications (→ users FK)
                      ├── 005_activity_logs (→ users FK)
                      |     └── reports (→ users FK)
                      ├── 006_trash (VUE → members, groups, networks, users)
                      └── 007_indexes (→ toutes les tables)
```

### Tables principales

| Table               | PK     | Soft Delete | Notes                                  |
|:--------------------|:------:|:-----------:|:---------------------------------------|
| `roles`             | SERIAL | Non         | 4 rôles prédéfinis                     |
| `permissions`       | SERIAL | Non         | 34 permissions granulaires             |
| `role_permissions`  | (N×N)  | Non         | Table de jonction roles ↔ permissions  |
| `users`             | SERIAL | ✅ Oui      | Agents, validateurs, admin             |
| `groups`            | SERIAL | ✅ Oui      | Groupes de Solidarité (GS)             |
| `networks`          | SERIAL | ✅ Oui      | Réseaux (fédère des GS)                |
| `members`           | SERIAL | ✅ Oui      | Membres individuels                    |
| `formations`        | SERIAL | Non         | Formations (1-to-1 avec members)       |
| `notifications`     | UUID   | Non         | Alertes destinées aux utilisateurs     |
| `activity_logs`     | UUID   | Non         | Journal d'audit immuable               |
| `reports`           | UUID   | Non         | Historique des rapports générés        |

### Vues calculées

| Vue                 | Source                            | Usage                           |
|:--------------------|:----------------------------------|:--------------------------------|
| `v_trash`           | members + groups + networks + users | Corbeille unifiée              |
| `v_members_full`    | members + formations              | Membres avec toutes formations  |
| `v_dashboard_stats` | members + groups + networks + users | Compteurs tableau de bord     |

---

## Idempotence

Toutes les migrations sont **idempotentes** : elles peuvent être rejouées sans erreur.

| Mécanisme                       | Utilisé pour                                |
|:--------------------------------|:--------------------------------------------|
| `CREATE TABLE IF NOT EXISTS`    | Toutes les tables                           |
| `CREATE EXTENSION IF NOT EXISTS`| Extensions PostgreSQL                       |
| `CREATE OR REPLACE FUNCTION`    | `set_updated_at()`                          |
| `CREATE OR REPLACE TRIGGER`     | Via bloc `DO $$ IF NOT EXISTS $$`           |
| `CREATE OR REPLACE VIEW`        | Toutes les vues                             |
| `CREATE INDEX IF NOT EXISTS`    | Tous les index                              |
| `ON CONFLICT DO NOTHING`        | Données initiales (rôles, permissions, admin)|

---

## Stratégie Soft Delete

Les tables `users`, `groups`, `networks` et `members` implémentent un **soft delete** :

```sql
-- Supprimer (soft)
UPDATE members SET deleted = TRUE, deleted_at = NOW(), deleted_by = :userId
WHERE id = :id;

-- Restaurer
UPDATE members SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
WHERE id = :id;

-- Supprimer définitivement
DELETE FROM members WHERE id = :id;

-- Toujours filtrer dans les requêtes applicatives
SELECT * FROM members WHERE deleted = FALSE;
```

La vue `v_trash` agrège automatiquement tous les éléments soft-deleted.

---

## Compte administrateur initial

> ⚠️ **SÉCURITÉ — Changer le mot de passe dès la première connexion !**

| Champ    | Valeur                     |
|:---------|:---------------------------|
| Username | `admin`                    |
| Email    | `admin@tsinjoaina.org`     |
| Password | `Admin@1234`               |
| Rôle     | `ADMINISTRATEUR_SYSTEME`   |

Le hash bcrypt est généré avec `bcryptjs` (rounds = 10).  
**Ne jamais utiliser ce hash en production.**

---

## Variables d'environnement

Configurer le fichier `.env` du backend avant de démarrer l'application :

```env
# Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres

# Neon
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DBNAME]?sslmode=require

# Local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tsinjoaina
```

---

## Vérification post-migration

Après l'exécution de toutes les migrations, vérifier l'état de la base :

```sql
-- Lister toutes les tables créées
SELECT tablename
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;

-- Lister tous les index créés
SELECT tablename, indexname
FROM   pg_indexes
WHERE  schemaname = 'public'
ORDER  BY tablename, indexname;

-- Vérifier les vues
SELECT viewname
FROM   pg_views
WHERE  schemaname = 'public';

-- Vérifier les rôles et permissions
SELECT r.code AS role, COUNT(rp.permission_id) AS nb_permissions
FROM   roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP  BY r.code
ORDER  BY r.level;

-- Vérifier l'admin
SELECT username, email, role_applicatif, actif
FROM   users
WHERE  username = 'admin';
```

---

## Ressources

- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Supabase — SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
- [Neon — SQL Editor](https://neon.tech/docs/get-started-with-neon/query-with-neon-sql-editor)
- [pg_trgm — Trigram Indexes](https://www.postgresql.org/docs/current/pgtrgm.html)

---

*Tsinjo Aina ONG — Base de données v2.0.0*  
*Compatible PostgreSQL 14+ | Supabase | Neon*
