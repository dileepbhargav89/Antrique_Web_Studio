'use client';

import { useQuery } from '@tanstack/react-query';
import { listPayments, getPayment } from '../api/payments';
import { paymentKeys } from '../api/query-keys';
import type { PaymentListParams } from '@/types/api/billing';

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: ({ signal }) => listPayments(params, signal),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: ({ signal }) => getPayment(id, signal),
    enabled: Boolean(id),
  });
}
