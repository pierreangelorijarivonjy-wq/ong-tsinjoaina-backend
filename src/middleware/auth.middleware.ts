/**
 * src/middleware/auth.middleware.ts
 * ---------------------------------
 * Vérifie le JWT dans le header Authorization: Bearer <token>.
 * Injecte req.user avec le payload décodé.
 */

import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, JwtPayload } from "../types";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Token d'authentification manquant ou invalide.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: "Token expiré. Veuillez vous reconnecter." });
    } else {
      res.status(401).json({ success: false, error: "Token invalide." });
    }
  }
}
