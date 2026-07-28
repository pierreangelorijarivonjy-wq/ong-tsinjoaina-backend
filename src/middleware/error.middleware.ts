/**
 * src/middleware/error.middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestionnaire d'erreurs global Express.
 * Doit être enregistré EN DERNIER dans server.ts (après toutes les routes).
 *
 * Gère trois catégories d'erreurs :
 *   1. Erreurs métier  : throw { status, message } depuis les services
 *   2. AppError        : throw new AppError(message, statusCode)
 *   3. Erreurs PG      : erreurs du driver pg (codes SQLSTATE)
 */

import { Request, Response, NextFunction } from "express";
import { isPgError, pgErrorToUserMessage } from "../utils/pg-errors";

// ─── Interface interne ────────────────────────────────────────────────────────

interface BusinessError {
  status?: number;
  statusCode?: number;
  message?: string;
}

function isBusinessError(err: unknown): err is BusinessError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "statusCode" in err || "message" in err)
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── 1. Erreur PostgreSQL (driver pg) ── priorité la plus haute
  if (isPgError(err)) {
    const { status, message } = pgErrorToUserMessage(err);

    if (status >= 500) {
      console.error("[PG ERROR]", {
        code:       err.code,
        constraint: err.constraint,
        table:      err.table,
        column:     err.column,
        message:    err.message,
        timestamp:  new Date().toISOString(),
      });
    }

    res.status(status).json({ success: false, error: message });
    return;
  }

  // ── 2. AppError (classe maison) ──────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error("[APP ERROR]", {
        message:   err.message,
        stack:     err.stack,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
    return;
  }

  // ── 3. Error standard avec statusCode/status ─────────────────────
  if (err instanceof Error) {
    const anyErr = err as Error & { statusCode?: number; status?: number };
    const statusCode = anyErr.statusCode ?? anyErr.status ?? 500;

    if (statusCode >= 500) {
      console.error("[ERROR]", {
        message:   err.message,
        stack:     err.stack,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(statusCode).json({
      success: false,
      error: err.message ?? "Erreur serveur interne.",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
    return;
  }

  // ── 4. Erreur métier : throw { status, message } ─────────────────
  if (isBusinessError(err)) {
    const statusCode = err.status ?? err.statusCode ?? 500;
    const message    = err.message ?? "Erreur serveur interne.";

    if (statusCode >= 500) {
      console.error("[BUSINESS ERROR]", { statusCode, message, timestamp: new Date().toISOString() });
    }

    res.status(statusCode).json({ success: false, error: message });
    return;
  }

  // ── 5. Erreur inconnue ───────────────────────────────────────────
  console.error("[UNKNOWN ERROR]", { err, timestamp: new Date().toISOString() });
  res.status(500).json({ success: false, error: "Erreur serveur interne inattendue." });
}

// ─── AppError ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
    // Capture de la stack correcte en TypeScript
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
