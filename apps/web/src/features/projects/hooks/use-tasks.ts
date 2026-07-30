'use client';

import { useQuery } from '@tanstack/react-query';
import { listTasks } from '../api/tasks';
import { taskKeys } from '../api/query-keys';
import type { TaskListParams } from '@/types/api/projects';

export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: ({ signal }) => listTasks(params, signal),
    enabled: Boolean(params.projectId),
  });
}
