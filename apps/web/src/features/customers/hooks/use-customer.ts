'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { getCustomer, listCustomers } from '../api/customers';
import type { CustomerListParams } from '@/types/api/customers';

export const customerKeys = createQueryKeys('customers');

export function useCustomer(id: string | null | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getCustomer(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCustomers(params: CustomerListParams, enabled = true) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => listCustomers(params, signal),
    enabled,
  });
}
