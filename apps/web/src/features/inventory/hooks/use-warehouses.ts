'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { listWarehouses, getWarehouse } from '../api/warehouses';
import type { WarehouseListParams } from '@/types/api/inventory';

export const warehouseKeys = createQueryKeys('warehouses');

export function useWarehouses(params: WarehouseListParams) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: ({ signal }) => listWarehouses(params, signal),
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: ({ signal }) => getWarehouse(id, signal),
    enabled: Boolean(id),
  });
}
