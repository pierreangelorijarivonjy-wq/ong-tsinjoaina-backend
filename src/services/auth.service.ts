/**
 * src/services/auth.service.ts
 * ───────────────────────────────
 * Logique d'authentification :
 * - Vérification des credentials contre la DB
 * - Génération du JWT
 * - Récupération du profil courant
 *
 * Ce service est INDÉPENDANT d'Express (pas de req/res).
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository";
import { UserModel } from "../models/user.model";
import { JwtPayload } from "../types";

export interface LoginResult {
  token: string;
  user: UserModel;
}

export interface LoginDto {
  usernameOrEmail: string;
  mot_de_passe: string;
}

export class AuthService {
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await userRepository.findByCredential(dto.usernameOrEmail);

    if (!user) {
      throw { status: 401, message: "Identifiant ou mot de passe incorrect." };
    }

    if (!user.actif) {
      throw { status: 403, message: "Ce compte est désactivé. Veuillez contacter l'administrateur." };
    }

    const passwordMatch = await bcrypt.compare(dto.mot_de_passe, user.password_hash);
    if (!passwordMatch) {
      throw { status: 401, message: "Identifiant ou mot de passe incorrect." };
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role_applicatif: user.role_applicatif,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw { status: 500, message: "Configuration JWT manquante." };
    }

    const token = jwt.sign(payload, secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "24h") as jwt.SignOptions["expiresIn"],
    });

    // Ne jamais retourner password_hash
    const { password_hash: _ph, ...safeUser } = user;

    return { token, user: safeUser as UserModel };
  }

  async getProfile(userId: number): Promise<UserModel> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw { status: 404, message: "Utilisateur introuvable." };
    }
    return user;
  }
}

export const authService = new AuthService();
