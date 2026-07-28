/**
 * src/repositories/base.repository.ts
 * ─────────────────────────────────────
 * Interface générique pour un repository avec CRUD complet + soft delete.
 * Toutes les implémentations concrètes doivent respecter ce contrat.
 */

// ─── Interface de base CRUD ───────────────────────────────────────────────────

export interface IRepository<TModel, TCreateDto, TUpdateDto, TFilters> {
  /** Récupérer tous les éléments actifs (non supprimés) avec filtres optionnels */
  findAll(filters?: TFilters): Promise<TModel[]>;

  /** Récupérer tous les éléments dans la corbeille */
  findDeleted(filters?: Partial<TFilters>): Promise<TModel[]>;

  /** Récupérer un élément par son ID */
  findById(id: number | string): Promise<TModel | null>;

  /** Créer un nouvel élément */
  create(data: TCreateDto, createdBy?: number): Promise<TModel>;

  /** Mettre à jour un élément existant */
  update(id: number | string, data: TUpdateDto): Promise<TModel | null>;

  /** Suppression logique (soft delete) */
  softDelete(id: number | string, deletedBy?: number): Promise<boolean>;

  /** Restaurer depuis la corbeille */
  restore(id: number | string): Promise<boolean>;

  /** Suppression physique définitive */
  permanentDelete(id: number | string): Promise<void>;
}
