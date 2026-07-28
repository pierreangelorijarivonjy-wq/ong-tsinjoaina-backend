/**
 * src/config/database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couche d'accès à la base de données PostgreSQL — Pool Lazy.
 *
 * Architecture :
 *   La connexion n'est établie qu'au premier appel à db.query() ou db.connect().
 *   Le module peut donc être importé et le projet peut compiler SANS que
 *   DATABASE_URL soit défini dans .env.
 *
 *   Une fois le projet Supabase/Neon créé et .env rempli, ce module
 *   fonctionnera automatiquement sans aucun changement de code.
 *
 * SSL :
 *   Supabase et Neon imposent TLS sur toutes les connexions.
 *   `rejectUnauthorized: false` est utilisé car Supabase utilise un certificat
 *   auto-signé sur le port 5432 en mode Transaction Pooler (port 6543).
 *   En production hébergée (Render, Railway), ce comportement est identique.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

// ─── Interface publique ───────────────────────────────────────────────────────

export interface DbPool {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;

  connect(): Promise<PoolClient>;
}

// ─── Détermine si SSL est requis ──────────────────────────────────────────────

function getSslConfig(): false | { rejectUnauthorized: boolean } {
  const dbUrl = process.env.DATABASE_URL ?? "";
  // Supabase, Neon, Railway, Render → connexions toujours TLS
  const requiresSsl =
    dbUrl.includes("supabase.co") ||
    dbUrl.includes("neon.tech") ||
    dbUrl.includes("render.com") ||
    dbUrl.includes("railway.app") ||
    process.env.NODE_ENV === "production";

  if (requiresSsl) {
    return { rejectUnauthorized: false };
  }
  return false; // localhost sans SSL
}

// ─── Implémentation Lazy Pool ─────────────────────────────────────────────────

class LazyPool implements DbPool {
  private _pool: Pool | null = null;

  /**
   * Instancie le pool PostgreSQL au premier accès.
   * Lance une erreur claire si DATABASE_URL n'est pas définie.
   */
  private getPool(): Pool {
    if (!this._pool) {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          [
            "DATABASE_URL non définie.",
            "→ Créez un fichier .env basé sur .env.example",
            "→ Renseignez l'URL de connexion Supabase ou Neon",
          ].join("\n")
        );
      }

      this._pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: getSslConfig(),

        // Pool sizing
        max:                    10,    // 10 connexions simultanées max
        idleTimeoutMillis:      30_000, // Libère les connexions inactives après 30s
        connectionTimeoutMillis: 10_000, // Timeout de connexion : 10s

        // Identification du client dans pg_stat_activity (monitoring Supabase)
        application_name: "tsinjo-aina-api",

        // Timeout de requête côté driver (ps: statement_timeout PG est dans la migration)
        statement_timeout: 30_000, // 30s max par requête
      });

      // Erreurs d'inactivité du pool (ex: connexion coupée par le serveur)
      this._pool.on("error", (err) => {
        console.error("❌ Erreur inattendue du pool PostgreSQL :", err.message);
        // Ne pas crasher le process — le pool se reconnecte automatiquement
      });

      this._pool.on("connect", () => {
        if (process.env.NODE_ENV === "development") {
          console.log("🔗 Nouvelle connexion PostgreSQL établie.");
        }
      });
    }

    return this._pool;
  }

  async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> {
    return this.getPool().query<R>(text, values);
  }

  async connect(): Promise<PoolClient> {
    return this.getPool().connect();
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────

const db: DbPool = new LazyPool();

export default db;
