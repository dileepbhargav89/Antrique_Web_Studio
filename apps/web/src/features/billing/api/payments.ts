import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Payment, PaymentListParams } from '@/types/api/billing';

export function listPayments(
  params: PaymentListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Payment>> {
  return apiClient.get<PaginatedResponse<Payment>, PaymentListParams>('payments', {
    query: params,
    signal,
  });
}

export function getPayment(id: string, signal?: AbortSignal): Promise<Payment> {
  return apiClient.get<Payment>(`payments/${id}`, { signal });
}
