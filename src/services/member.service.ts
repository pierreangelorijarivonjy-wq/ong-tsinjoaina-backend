/**
 * src/services/member.service.ts
 * ────────────────────────────────
 * Logique métier pour les Membres.
 * Orchestre les appels au memberRepository.
 * Indépendant d'Express.
 */

import { memberRepository } from "../repositories/member.repository";
import {
  MemberModel,
  MemberCreateDto,
  MemberUpdateDto,
  MemberFilters,
} from "../models/member.model";

export class MemberService {
  async getAll(filters: MemberFilters): Promise<MemberModel[]> {
    return memberRepository.findAll(filters);
  }

  async getDeleted(filters: Partial<MemberFilters>): Promise<MemberModel[]> {
    return memberRepository.findDeleted(filters);
  }

  async getById(id: number | string): Promise<MemberModel> {
    const member = await memberRepository.findById(id);
    if (!member) {
      throw { status: 404, message: "Membre introuvable." };
    }
    return member;
  }

  async create(data: MemberCreateDto, createdBy?: number): Promise<MemberModel> {
    return memberRepository.create(data, createdBy);
  }

  async update(id: number | string, data: MemberUpdateDto): Promise<MemberModel> {
    const member = await memberRepository.update(id, data);
    if (!member) {
      throw { status: 404, message: "Membre introuvable." };
    }
    return member;
  }

  async softDelete(id: number | string, deletedBy?: number): Promise<void> {
    const success = await memberRepository.softDelete(id, deletedBy);
    if (!success) {
      throw { status: 404, message: "Membre introuvable." };
    }
  }

  async restore(id: number | string): Promise<void> {
    const success = await memberRepository.restore(id);
    if (!success) {
      throw { status: 404, message: "Membre introuvable dans la corbeille." };
    }
  }

  async permanentDelete(id: number | string): Promise<void> {
    await memberRepository.permanentDelete(id);
  }
}

export const memberService = new MemberService();
