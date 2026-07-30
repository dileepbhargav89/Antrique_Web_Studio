import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { InventoryTransaction, InventoryTransactionListParams } from '@/types/api/inventory';

/** Route order matters server-side (`GET /inventory/transactions` before `GET
 * /inventory/:id`) — irrelevant here, this just calls the fixed path. */
export function listInventoryTransactions(
  params: InventoryTransactionListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<InventoryTransaction>> {
  return apiClient.get<PaginatedResponse<InventoryTransaction>, InventoryTransactionListParams>(
    'inventory/transactions',
    {
      query: params,
      signal,
    },
  );
}
