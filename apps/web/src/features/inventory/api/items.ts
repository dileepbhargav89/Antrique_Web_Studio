import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { InventoryItem, InventoryItemListParams } from '@/types/api/inventory';

export function listInventoryItems(
  params: InventoryItemListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<InventoryItem>> {
  return apiClient.get<PaginatedResponse<InventoryItem>, InventoryItemListParams>('inventory', {
    query: params,
    signal,
  });
}

export function getInventoryItem(id: string, signal?: AbortSignal): Promise<InventoryItem> {
  return apiClient.get<InventoryItem>(`inventory/${id}`, { signal });
}
