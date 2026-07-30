import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Warehouse, WarehouseListParams } from '@/types/api/inventory';

export function listWarehouses(
  params: WarehouseListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Warehouse>> {
  return apiClient.get<PaginatedResponse<Warehouse>, WarehouseListParams>('warehouses', {
    query: params,
    signal,
  });
}

export function getWarehouse(id: string, signal?: AbortSignal): Promise<Warehouse> {
  return apiClient.get<Warehouse>(`warehouses/${id}`, { signal });
}
