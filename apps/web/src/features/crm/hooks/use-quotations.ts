'use client';

import { useQuery } from '@tanstack/react-query';
import { listQuotations, getQuotation } from '../api/quotations';
import { quotationKeys } from '../api/query-keys';
import type { QuotationListParams } from '@/types/api/crm';

export function useQuotations(params: QuotationListParams) {
  return useQuery({
    queryKey: quotationKeys.list(params),
    queryFn: ({ signal }) => listQuotations(params, signal),
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: ({ signal }) => getQuotation(id, signal),
    enabled: Boolean(id),
  });
}
