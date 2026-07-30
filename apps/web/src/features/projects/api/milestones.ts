import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Milestone,
  MilestoneListParams,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@/types/api/projects';

export function listMilestones(
  params: MilestoneListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Milestone>> {
  return apiClient.get<PaginatedResponse<Milestone>, MilestoneListParams>('milestones', {
    query: params,
    signal,
  });
}

export function getMilestone(id: string, signal?: AbortSignal): Promise<Milestone> {
  return apiClient.get<Milestone>(`milestones/${id}`, { signal });
}

export function createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
  return apiClient.post<Milestone>('milestones', input);
}

export function updateMilestone(id: string, input: UpdateMilestoneInput): Promise<Milestone> {
  return apiClient.patch<Milestone>(`milestones/${id}`, input);
}
