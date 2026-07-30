'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTask, updateTask } from '../api/tasks';
import { taskKeys } from '../api/query-keys';
import type { CreateTaskInput, UpdateTaskInput } from '@/types/api/projects';

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success('Task created.');
    },
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success('Task updated.');
    },
  });
}
