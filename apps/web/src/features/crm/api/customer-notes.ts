import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  CustomerNote,
  CustomerNoteListParams,
  CreateCustomerNoteInput,
} from '@/types/api/crm';

export function listCustomerNotes(
  params: CustomerNoteListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<CustomerNote>> {
  return apiClient.get<PaginatedResponse<CustomerNote>, CustomerNoteListParams>('customer-notes', {
    query: params,
    signal,
  });
}

export function createCustomerNote(input: CreateCustomerNoteInput): Promise<CustomerNote> {
  return apiClient.post<CustomerNote>('customer-notes', input);
}
