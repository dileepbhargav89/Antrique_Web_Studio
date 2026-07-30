'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { issueInvoice, voidInvoice } from '../api/invoices';
import { invoiceKeys } from '../api/query-keys';
import type { VoidInvoiceInput } from '@/types/api/billing';

export function useIssueInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => issueInvoice(id),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(id), invoice);
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success('Invoice issued.');
    },
  });
}

export function useVoidInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VoidInvoiceInput) => voidInvoice(id, input),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(id), invoice);
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success('Invoice voided.');
    },
  });
}
