import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  ContactRequest,
  ContactRequestListParams,
  ConvertContactRequestInput,
} from '@/types/api/crm';

export function listContactRequests(
  params: ContactRequestListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ContactRequest>> {
  return apiClient.get<PaginatedResponse<ContactRequest>, ContactRequestListParams>(
    'contact-requests',
    { query: params, signal },
  );
}

export function getContactRequest(id: string, signal?: AbortSignal): Promise<ContactRequest> {
  return apiClient.get<ContactRequest>(`contact-requests/${id}`, { signal });
}

export function convertContactRequest(
  id: string,
  input: ConvertContactRequestInput,
): Promise<ContactRequest> {
  return apiClient.post<ContactRequest>(`contact-requests/${id}/convert`, input);
}
