/**
 * src/db/index.ts
 * ───────────────
 * Point d'entrée historique — redirige vers la couche config/database.ts.
 * Ce fichier est conservé pour la compatibilité des imports existants.
 * Toute la logique de pool est dans config/database.ts.
 */

export { default } from "../config/database";
export type { DbPool } from "../config/database";
