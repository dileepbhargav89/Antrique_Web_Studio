import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Invoice, InvoiceListParams, VoidInvoiceInput } from '@/types/api/billing';

export function listInvoices(
  params: InvoiceListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Invoice>> {
  return apiClient.get<PaginatedResponse<Invoice>, InvoiceListParams>('invoices', {
    query: params,
    signal,
  });
}

export function getInvoice(id: string, signal?: AbortSignal): Promise<Invoice> {
  return apiClient.get<Invoice>(`invoices/${id}`, { signal });
}

/** `POST /invoices/:id/issue` — DRAFT → SENT only. */
export function issueInvoice(id: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`invoices/${id}/issue`, {});
}

export function voidInvoice(id: string, input: VoidInvoiceInput): Promise<Invoice> {
  return apiClient.post<Invoice>(`invoices/${id}/void`, input);
}
