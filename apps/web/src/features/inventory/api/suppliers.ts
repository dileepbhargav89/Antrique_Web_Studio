import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Supplier, SupplierListParams } from '@/types/api/inventory';

export function listSuppliers(
  params: SupplierListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Supplier>> {
  return apiClient.get<PaginatedResponse<Supplier>, SupplierListParams>('suppliers', {
    query: params,
    signal,
  });
}

export function getSupplier(id: string, signal?: AbortSignal): Promise<Supplier> {
  return apiClient.get<Supplier>(`suppliers/${id}`, { signal });
}
