/**
 * src/services/group.service.ts
 * ──────────────────────────────
 * Logique métier pour les Groupes de Solidarité.
 */

import { groupRepository } from "../repositories/group.repository";
import {
  GroupModel,
  GroupCreateDto,
  GroupUpdateDto,
  GroupFilters,
} from "../models/group.model";

export class GroupService {
  async getAll(filters: GroupFilters): Promise<GroupModel[]> {
    return groupRepository.findAll(filters);
  }

  async getDeleted(filters: Partial<GroupFilters>): Promise<GroupModel[]> {
    return groupRepository.findDeleted(filters);
  }

  async getById(id: number | string): Promise<GroupModel> {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw { status: 404, message: "Groupe introuvable." };
    }
    return group;
  }

  async create(data: GroupCreateDto, createdBy?: number): Promise<GroupModel> {
    return groupRepository.create(data, createdBy);
  }

  async update(id: number | string, data: GroupUpdateDto): Promise<GroupModel> {
    const group = await groupRepository.update(id, data);
    if (!group) {
      throw { status: 404, message: "Groupe introuvable." };
    }
    return group;
  }

  async softDelete(id: number | string, deletedBy?: number): Promise<void> {
    const success = await groupRepository.softDelete(id, deletedBy);
    if (!success) {
      throw { status: 404, message: "Groupe introuvable." };
    }
  }

  async restore(id: number | string): Promise<void> {
    const success = await groupRepository.restore(id);
    if (!success) {
      throw { status: 404, message: "Groupe introuvable dans la corbeille." };
    }
  }

  async permanentDelete(id: number | string): Promise<void> {
    await groupRepository.permanentDelete(id);
  }
}

export const groupService = new GroupService();
