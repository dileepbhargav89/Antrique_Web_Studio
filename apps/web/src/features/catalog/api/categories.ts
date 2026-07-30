import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Category, CategoryListParams } from '@/types/api/catalog';

export function listCategories(
  params: CategoryListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Category>> {
  return apiClient.get<PaginatedResponse<Category>, CategoryListParams>('categories', {
    query: params,
    signal,
  });
}

export function getCategory(id: string, signal?: AbortSignal): Promise<Category> {
  return apiClient.get<Category>(`categories/${id}`, { signal });
}
