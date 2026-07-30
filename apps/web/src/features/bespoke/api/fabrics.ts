import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Fabric, FabricListParams } from '@/types/api/bespoke';

export function listFabrics(
  params: FabricListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Fabric>> {
  return apiClient.get<PaginatedResponse<Fabric>, FabricListParams>('fabrics', {
    query: params,
    signal,
  });
}
