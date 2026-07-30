'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { listInventoryTransactions } from '../api/transactions';
import type { InventoryTransactionListParams } from '@/types/api/inventory';

export const inventoryTransactionKeys = createQueryKeys('inventory-transactions');

export function useInventoryTransactions(params: InventoryTransactionListParams) {
  return useQuery({
    queryKey: inventoryTransactionKeys.list(params),
    queryFn: ({ signal }) => listInventoryTransactions(params, signal),
  });
}
