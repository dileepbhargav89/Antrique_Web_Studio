'use client';

import { useQuery } from '@tanstack/react-query';
import { listInvoices, getInvoice } from '../api/invoices';
import { invoiceKeys } from '../api/query-keys';
import type { InvoiceListParams } from '@/types/api/billing';

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: ({ signal }) => listInvoices(params, signal),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: ({ signal }) => getInvoice(id, signal),
    enabled: Boolean(id),
  });
}
