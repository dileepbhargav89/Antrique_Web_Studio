import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Quotation,
  QuotationListParams,
  CreateQuotationInput,
  UpdateQuotationInput,
  RejectQuotationInput,
} from '@/types/api/crm';

export function listQuotations(
  params: QuotationListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Quotation>> {
  return apiClient.get<PaginatedResponse<Quotation>, QuotationListParams>('quotations', {
    query: params,
    signal,
  });
}

export function getQuotation(id: string, signal?: AbortSignal): Promise<Quotation> {
  return apiClient.get<Quotation>(`quotations/${id}`, { signal });
}

export function createQuotation(input: CreateQuotationInput): Promise<Quotation> {
  return apiClient.post<Quotation>('quotations', input);
}

export function updateQuotation(id: string, input: UpdateQuotationInput): Promise<Quotation> {
  return apiClient.patch<Quotation>(`quotations/${id}`, input);
}

export function sendQuotation(id: string): Promise<Quotation> {
  return apiClient.post<Quotation>(`quotations/${id}/send`);
}

export function acceptQuotation(id: string): Promise<Quotation> {
  return apiClient.post<Quotation>(`quotations/${id}/accept`);
}

export function rejectQuotation(id: string, input: RejectQuotationInput): Promise<Quotation> {
  return apiClient.post<Quotation>(`quotations/${id}/reject`, input);
}
