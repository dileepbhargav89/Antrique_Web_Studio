'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { listInventoryItems, getInventoryItem } from '../api/items';
import type { InventoryItemListParams } from '@/types/api/inventory';

export const inventoryItemKeys = createQueryKeys('inventory-items');

export function useInventoryItems(params: InventoryItemListParams) {
  return useQuery({
    queryKey: inventoryItemKeys.list(params),
    queryFn: ({ signal }) => listInventoryItems(params, signal),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryItemKeys.detail(id),
    queryFn: ({ signal }) => getInventoryItem(id, signal),
    enabled: Boolean(id),
  });
}
