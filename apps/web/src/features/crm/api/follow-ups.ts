import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { FollowUp, FollowUpListParams } from '@/types/api/crm';

export function listFollowUps(
  params: FollowUpListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<FollowUp>> {
  return apiClient.get<PaginatedResponse<FollowUp>, FollowUpListParams>('follow-ups', {
    query: params,
    signal,
  });
}

export function completeFollowUp(id: string): Promise<FollowUp> {
  return apiClient.post<FollowUp>(`follow-ups/${id}/complete`, {});
}

export function cancelFollowUp(id: string): Promise<FollowUp> {
  return apiClient.post<FollowUp>(`follow-ups/${id}/cancel`, {});
}

export function reopenFollowUp(id: string): Promise<FollowUp> {
  return apiClient.post<FollowUp>(`follow-ups/${id}/reopen`, {});
}
