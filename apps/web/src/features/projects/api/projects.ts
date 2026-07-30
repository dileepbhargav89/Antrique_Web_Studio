import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Project,
  ProjectDetail,
  ProjectListParams,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMember,
  AddProjectMemberInput,
  ActivityLogEntry,
} from '@/types/api/projects';

export function listProjects(
  params: ProjectListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Project>> {
  return apiClient.get<PaginatedResponse<Project>, ProjectListParams>('projects', {
    query: params,
    signal,
  });
}

export function getProject(id: string, signal?: AbortSignal): Promise<ProjectDetail> {
  return apiClient.get<ProjectDetail>(`projects/${id}`, { signal });
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiClient.post<Project>('projects', input);
}

export function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  return apiClient.patch<Project>(`projects/${id}`, input);
}

export function archiveProject(id: string): Promise<Project> {
  return apiClient.post<Project>(`projects/${id}/archive`);
}

export function addProjectMember(id: string, input: AddProjectMemberInput): Promise<ProjectMember> {
  return apiClient.post<ProjectMember>(`projects/${id}/members`, input);
}

export function removeProjectMember(id: string, userId: string): Promise<void> {
  return apiClient.delete<void>(`projects/${id}/members/${userId}`);
}

export function listProjectActivity(
  id: string,
  params: { page?: number; limit?: number },
  signal?: AbortSignal,
): Promise<PaginatedResponse<ActivityLogEntry>> {
  return apiClient.get<PaginatedResponse<ActivityLogEntry>>(`projects/${id}/activity`, {
    query: params,
    signal,
  });
}
