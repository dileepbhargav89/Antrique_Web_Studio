import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Product, ProductListParams } from '@/types/api/catalog';

export function listProducts(
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  return apiClient.get<PaginatedResponse<Product>, ProductListParams>('products', {
    query: params,
    signal,
  });
}

/** Detail response includes populated `variants`/`images` — list rows omit both. */
export function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return apiClient.get<Product>(`products/${id}`, { signal });
}
