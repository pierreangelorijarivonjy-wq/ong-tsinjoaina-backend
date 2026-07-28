/**
 * src/server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Point d'entrée principal du backend Tsinjo Aina API.
 * Express + CORS + Helmet + Rate limiting + Routes + Error handler
 *
 * Prêt pour PostgreSQL (Supabase / Neon) :
 *   1. Créer .env depuis .env.example
 *   2. Renseigner DATABASE_URL, JWT_SECRET
 *   3. Exécuter les migrations SQL (database/migrations/)
 *   4. npm run dev
 */

import "express-async-errors"; // Capture automatique des erreurs async dans Express
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Routes
import authRoutes     from "./routes/auth.routes";
import membersRoutes  from "./routes/members.routes";
import groupsRoutes   from "./routes/groups.routes";
import networksRoutes from "./routes/networks.routes";
import usersRoutes    from "./routes/users.routes";
import activityRoutes from "./routes/activity.routes";
import trashRoutes    from "./routes/trash.routes";

// Middleware
import { errorMiddleware } from "./middleware/error.middleware";

dotenv.config();

const app    = express();
const PORT   = parseInt(process.env.PORT ?? "3001", 10);

// ─── Sécurité HTTP ────────────────────────────────────────────────────────────
app.use(helmet());

// Confiance aux proxies (Render, Railway, Vercel) pour req.ip correct
app.set("trust proxy", 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (Postman, curl, tests automatisés)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
      }
    },
    credentials: true,
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Général : 100 requêtes/min par IP (toutes les routes)
app.use(
  rateLimit({
    windowMs:       60 * 1000,
    max:            100,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, error: "Trop de requêtes. Réessayez dans une minute." },
  })
);

// Login : 10 tentatives/min — protection anti brute-force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      10,
  message: { success: false, error: "Trop de tentatives de connexion. Réessayez dans une minute." },
});

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));        // 10 MB pour les imports JSON/CSV
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:      "ok",
    service:     "Tsinjo Aina API",
    version:     "1.0.0",
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth",     loginLimiter, authRoutes);
app.use("/members",  membersRoutes);
app.use("/groups",   groupsRoutes);
app.use("/networks", networksRoutes);
app.use("/users",    usersRoutes);
app.use("/activity", activityRoutes);
app.use("/trash",    trashRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route introuvable." });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Démarrage ────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Tsinjo Aina API démarré sur http://localhost:${PORT}`);
  console.log(`📡 Environnement : ${process.env.NODE_ENV ?? "development"}`);
  console.log(`🌐 CORS autorisé pour : ${allowedOrigins.join(", ")}`);
  console.log(`🗄️  Base de données : ${process.env.DATABASE_URL ? "configurée" : "⚠️  DATABASE_URL manquante — définie dans .env"}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Permet aux connexions DB actives de se terminer proprement
// avant que le process ne s'arrête (SIGTERM depuis Render/Railway/Docker).

function shutdown(signal: string): void {
  console.log(`\n⚠️  Signal ${signal} reçu — arrêt en cours...`);
  server.close(() => {
    console.log("✅ Serveur HTTP fermé.");
    process.exit(0);
  });

  // Forcer l'arrêt après 10s si des connexions traînent
  setTimeout(() => {
    console.error("❌ Arrêt forcé après 10s (connexions persistantes).");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM")); // Render, Railway, Heroku
process.on("SIGINT",  () => shutdown("SIGINT"));  // Ctrl+C en développement

// ─── Erreurs non capturées ────────────────────────────────────────────────────
// Ne pas crasher sur des erreurs async non traitées — logger uniquement.

process.on("unhandledRejection", (reason) => {
  console.error("❌ Promise rejetée non gérée :", reason);
  // Ne pas appeler process.exit() ici — laisser Express continuer
});

process.on("uncaughtException", (err) => {
  console.error("❌ Exception non capturée :", err.message);
  console.error(err.stack);
  // Exception non capturée = état imprévisible → arrêt propre
  shutdown("uncaughtException");
});

export default app;
