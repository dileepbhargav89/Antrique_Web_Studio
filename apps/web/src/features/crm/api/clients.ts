import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Client,
  ClientListParams,
  CreateClientInput,
  UpdateClientInput,
} from '@/types/api/crm';

export function listClients(
  params: ClientListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Client>> {
  return apiClient.get<PaginatedResponse<Client>, ClientListParams>('clients', {
    query: params,
    signal,
  });
}

export function getClient(id: string, signal?: AbortSignal): Promise<Client> {
  return apiClient.get<Client>(`clients/${id}`, { signal });
}

export function createClient(input: CreateClientInput): Promise<Client> {
  return apiClient.post<Client>('clients', input);
}

export function updateClient(id: string, input: UpdateClientInput): Promise<Client> {
  return apiClient.patch<Client>(`clients/${id}`, input);
}
