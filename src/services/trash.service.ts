/**
 * src/services/trash.service.ts
 * ──────────────────────────────
 * Logique métier pour la Corbeille centralisée.
 */

import { trashRepository, TrashItem, TrashSummary } from "../repositories/trash.repository";
import { TrashItemType } from "../types";

const VALID_TYPES: TrashItemType[] = ["member", "group", "network", "user"];

export class TrashService {
  async getAll(createdBy?: number): Promise<TrashItem[]> {
    return trashRepository.findAll(createdBy);
  }

  async getSummary(): Promise<TrashSummary> {
    return trashRepository.getSummary();
  }

  async restore(type: string, id: string): Promise<void> {
    if (!VALID_TYPES.includes(type as TrashItemType)) {
      throw { status: 400, message: `Type invalide : ${type}` };
    }
    const success = await trashRepository.restore(type as TrashItemType, id);
    if (!success) {
      throw { status: 404, message: "Élément introuvable dans la corbeille." };
    }
  }

  async permanentDelete(type: string, id: string): Promise<void> {
    if (!VALID_TYPES.includes(type as TrashItemType)) {
      throw { status: 400, message: `Type invalide : ${type}` };
    }
    await trashRepository.permanentDelete(type as TrashItemType, id);
  }

  async emptyAll(): Promise<void> {
    await trashRepository.emptyAll();
  }
}

export const trashService = new TrashService();
