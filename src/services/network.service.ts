/**
 * src/services/network.service.ts
 * ────────────────────────────────
 * Logique métier pour les Réseaux de Solidarité.
 */

import { networkRepository } from "../repositories/network.repository";
import {
  NetworkModel,
  NetworkCreateDto,
  NetworkUpdateDto,
  NetworkFilters,
} from "../models/network.model";

export class NetworkService {
  async getAll(filters: NetworkFilters): Promise<NetworkModel[]> {
    return networkRepository.findAll(filters);
  }

  async getDeleted(filters: Partial<NetworkFilters>): Promise<NetworkModel[]> {
    return networkRepository.findDeleted(filters);
  }

  async getById(id: number | string): Promise<NetworkModel> {
    const network = await networkRepository.findById(id);
    if (!network) {
      throw { status: 404, message: "Réseau introuvable." };
    }
    return network;
  }

  async create(data: NetworkCreateDto, createdBy?: number): Promise<NetworkModel> {
    return networkRepository.create(data, createdBy);
  }

  async update(id: number | string, data: NetworkUpdateDto): Promise<NetworkModel> {
    const network = await networkRepository.update(id, data);
    if (!network) {
      throw { status: 404, message: "Réseau introuvable." };
    }
    return network;
  }

  async softDelete(id: number | string, deletedBy?: number): Promise<void> {
    const success = await networkRepository.softDelete(id, deletedBy);
    if (!success) {
      throw { status: 404, message: "Réseau introuvable." };
    }
  }

  async restore(id: number | string): Promise<void> {
    const success = await networkRepository.restore(id);
    if (!success) {
      throw { status: 404, message: "Réseau introuvable dans la corbeille." };
    }
  }

  async permanentDelete(id: number | string): Promise<void> {
    await networkRepository.permanentDelete(id);
  }
}

export const networkService = new NetworkService();
