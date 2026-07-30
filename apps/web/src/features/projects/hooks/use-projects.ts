'use client';

import { useQuery } from '@tanstack/react-query';
import { listProjects, getProject, listProjectActivity } from '../api/projects';
import { projectKeys, activityKeys } from '../api/query-keys';
import type { ProjectListParams } from '@/types/api/projects';

export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: ({ signal }) => listProjects(params, signal),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) => getProject(id, signal),
    enabled: Boolean(id),
  });
}

export function useProjectActivity(id: string, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...activityKeys.detail(id), params],
    queryFn: ({ signal }) => listProjectActivity(id, params, signal),
    enabled: Boolean(id),
  });
}
