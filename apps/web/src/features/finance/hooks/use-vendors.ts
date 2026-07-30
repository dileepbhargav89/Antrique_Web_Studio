'use client';

import { useQuery } from '@tanstack/react-query';
import { listVendors, getVendor } from '../api/vendors';
import { vendorKeys } from '../api/query-keys';
import type { VendorListParams } from '@/types/api/finance';

export function useVendors(params: VendorListParams) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: ({ signal }) => listVendors(params, signal),
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: ({ signal }) => getVendor(id, signal),
    enabled: Boolean(id),
  });
}
