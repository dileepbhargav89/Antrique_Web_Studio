import type { SortDirection } from './common';

/**
 * Hand-authored from the real backend DTOs (`apps/api/src/modules/catalog/dto/*.ts`) —
 * the generated `types/api/schema.ts` types every field `Record<string, never>` and is
 * not usable here. Field names/optionality below are verified against the actual
 * `*ResponseDto` constructors, not guessed.
 */
export type CategoryStatus = 'ACTIVE' | 'ARCHIVED';
export type CollectionStatus = 'ACTIVE' | 'ARCHIVED';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type CatalogSortField = 'name' | 'createdAt' | 'sortOrder';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CategoryStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CollectionStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string | null;
  attributes: unknown;
  /** `Decimal.toString()` server-side — a numeric string, never a `number`. */
  price: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
  status: ProductStatus;
  sortOrder: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  /** Populated on `GET /products/:id` only — omitted (not just empty) on list rows. */
  variants?: ProductVariant[];
  /** Populated on `GET /products/:id` only — omitted (not just empty) on list rows. */
  images?: ProductImage[];
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  status?: CategoryStatus;
  search?: string;
  sortBy?: CatalogSortField;
  sortDirection?: SortDirection;
}

export interface CollectionListParams {
  page?: number;
  limit?: number;
  status?: CollectionStatus;
  search?: string;
  sortBy?: CatalogSortField;
  sortDirection?: SortDirection;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  collectionId?: string;
  status?: ProductStatus;
  search?: string;
  sortBy?: CatalogSortField;
  sortDirection?: SortDirection;
}
