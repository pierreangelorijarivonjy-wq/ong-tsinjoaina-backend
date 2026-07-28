/**
 * src/services/user.service.ts
 * ─────────────────────────────
 * Logique métier pour les Utilisateurs.
 * Gère le hachage des mots de passe avant de déléguer au repository.
 */

import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository";
import { UserModel, UserCreateDto, UserUpdateDto } from "../models/user.model";

const SALT_ROUNDS = 10;

export class UserService {
  async getAll(): Promise<UserModel[]> {
    return userRepository.findAll();
  }

  async getDeleted(): Promise<UserModel[]> {
    return userRepository.findDeleted();
  }

  async getById(id: number | string): Promise<UserModel> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw { status: 404, message: "Utilisateur introuvable." };
    }
    return user;
  }

  async create(dto: UserCreateDto): Promise<UserModel> {
    if (!dto.mot_de_passe || dto.mot_de_passe.length < 6) {
      throw { status: 400, message: "Le mot de passe doit contenir au moins 6 caractères." };
    }

    const password_hash = await bcrypt.hash(dto.mot_de_passe, SALT_ROUNDS);

    try {
      return await userRepository.create({ ...dto, password_hash });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        throw { status: 409, message: "Ce nom d'utilisateur ou email est déjà utilisé." };
      }
      throw err;
    }
  }

  async update(id: number | string, dto: UserUpdateDto): Promise<UserModel> {
    let password_hash: string | undefined;

    if (dto.mot_de_passe) {
      if (dto.mot_de_passe.length < 6) {
        throw { status: 400, message: "Le mot de passe doit contenir au moins 6 caractères." };
      }
      password_hash = await bcrypt.hash(dto.mot_de_passe, SALT_ROUNDS);
    }

    const user = await userRepository.update(id, { ...dto, password_hash });
    if (!user) {
      throw { status: 404, message: "Utilisateur introuvable." };
    }
    return user;
  }

  async softDelete(id: number | string, currentUserId: number): Promise<void> {
    if (Number(id) === currentUserId) {
      throw { status: 400, message: "Vous ne pouvez pas supprimer votre propre compte." };
    }
    const success = await userRepository.softDelete(id, currentUserId);
    if (!success) {
      throw { status: 404, message: "Utilisateur introuvable." };
    }
  }

  async restore(id: number | string): Promise<void> {
    const success = await userRepository.restore(id);
    if (!success) {
      throw { status: 404, message: "Utilisateur introuvable dans la corbeille." };
    }
  }

  async permanentDelete(id: number | string, currentUserId: number): Promise<void> {
    if (Number(id) === currentUserId) {
      throw { status: 400, message: "Impossible de supprimer votre propre compte." };
    }
    await userRepository.permanentDelete(id);
  }

  async toggleActif(
    id: number | string,
    currentUserId: number
  ): Promise<{ id: number; actif: boolean }> {
    if (Number(id) === currentUserId) {
      throw { status: 400, message: "Vous ne pouvez pas désactiver votre propre compte." };
    }
    const result = await userRepository.toggleActif(id);
    if (!result) {
      throw { status: 404, message: "Utilisateur introuvable." };
    }
    return result;
  }
}

export const userService = new UserService();
