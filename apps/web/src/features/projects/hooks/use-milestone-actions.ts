'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createMilestone, updateMilestone } from '../api/milestones';
import { milestoneKeys, projectKeys } from '../api/query-keys';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '@/types/api/projects';

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => createMilestone(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      // Completion % (project detail) depends on the project's milestone set.
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success('Milestone created.');
    },
  });
}

export function useUpdateMilestone(id: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMilestoneInput) => updateMilestone(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success('Milestone updated.');
    },
  });
}
