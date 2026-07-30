'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createQuotation,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
} from '../api/quotations';
import { quotationKeys } from '../api/query-keys';
import type {
  CreateQuotationInput,
  UpdateQuotationInput,
  RejectQuotationInput,
} from '@/types/api/crm';

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => createQuotation(input),
    onSuccess: (quotation) => {
      queryClient.setQueryData(quotationKeys.detail(quotation.id), quotation);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      toast.success('Quotation created.');
    },
  });
}

export function useUpdateQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => updateQuotation(id, input),
    onSuccess: (quotation) => {
      queryClient.setQueryData(quotationKeys.detail(id), quotation);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      toast.success('Quotation updated.');
    },
  });
}

export function useSendQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendQuotation(id),
    onSuccess: (quotation) => {
      queryClient.setQueryData(quotationKeys.detail(id), quotation);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      toast.success('Quotation sent.');
    },
  });
}

export function useAcceptQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptQuotation(id),
    onSuccess: (quotation) => {
      queryClient.setQueryData(quotationKeys.detail(id), quotation);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      toast.success('Quotation accepted.');
    },
  });
}

export function useRejectQuotation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RejectQuotationInput) => rejectQuotation(id, input),
    onSuccess: (quotation) => {
      queryClient.setQueryData(quotationKeys.detail(id), quotation);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      toast.success('Quotation rejected.');
    },
  });
}
