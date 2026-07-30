'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { listSuppliers, getSupplier } from '../api/suppliers';
import type { SupplierListParams } from '@/types/api/inventory';

export const supplierKeys = createQueryKeys('suppliers');

export function useSuppliers(params: SupplierListParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: ({ signal }) => listSuppliers(params, signal),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: ({ signal }) => getSupplier(id, signal),
    enabled: Boolean(id),
  });
}
