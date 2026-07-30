import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Task, TaskListParams, CreateTaskInput, UpdateTaskInput } from '@/types/api/projects';

export function listTasks(
  params: TaskListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Task>> {
  return apiClient.get<PaginatedResponse<Task>, TaskListParams>('tasks', { query: params, signal });
}

export function getTask(id: string, signal?: AbortSignal): Promise<Task> {
  return apiClient.get<Task>(`tasks/${id}`, { signal });
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiClient.post<Task>('tasks', input);
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiClient.patch<Task>(`tasks/${id}`, input);
}
