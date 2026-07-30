'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createProject,
  updateProject,
  archiveProject,
  addProjectMember,
  removeProjectMember,
} from '../api/projects';
import { projectKeys } from '../api/query-keys';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
} from '@/types/api/projects';

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project created.');
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => updateProject(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project updated.');
    },
  });
}

export function useArchiveProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project archived.');
    },
  });
}

export function useAddProjectMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProjectMemberInput) => addProjectMember(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      toast.success('Member added.');
    },
  });
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeProjectMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      toast.success('Member removed.');
    },
  });
}
