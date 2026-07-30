import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Collection, CollectionListParams } from '@/types/api/catalog';

export function listCollections(
  params: CollectionListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Collection>> {
  return apiClient.get<PaginatedResponse<Collection>, CollectionListParams>('collections', {
    query: params,
    signal,
  });
}

export function getCollection(id: string, signal?: AbortSignal): Promise<Collection> {
  return apiClient.get<Collection>(`collections/${id}`, { signal });
}
