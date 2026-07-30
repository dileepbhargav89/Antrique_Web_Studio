import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Lead,
  LeadListParams,
  ArchiveLeadInput,
  ConvertLeadInput,
  ConvertLeadToClientInput,
} from '@/types/api/crm';

export function listLeads(
  params: LeadListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Lead>> {
  return apiClient.get<PaginatedResponse<Lead>, LeadListParams>('leads', { query: params, signal });
}

export function getLead(id: string, signal?: AbortSignal): Promise<Lead> {
  return apiClient.get<Lead>(`leads/${id}`, { signal });
}

export function archiveLead(id: string, input: ArchiveLeadInput): Promise<Lead> {
  return apiClient.post<Lead>(`leads/${id}/archive`, input);
}

export function convertLead(id: string, input: ConvertLeadInput): Promise<Lead> {
  return apiClient.post<Lead>(`leads/${id}/convert`, input);
}

export function convertLeadToClient(id: string, input: ConvertLeadToClientInput): Promise<Lead> {
  return apiClient.post<Lead>(`leads/${id}/convert-to-client`, input);
}
