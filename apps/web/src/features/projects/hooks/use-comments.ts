'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listComments, createComment } from '../api/comments';
import { commentKeys } from '../api/query-keys';
import type { CommentListParams, CreateCommentInput } from '@/types/api/projects';

export function useComments(params: CommentListParams) {
  return useQuery({
    queryKey: commentKeys.list(params),
    queryFn: ({ signal }) => listComments(params, signal),
    enabled: Boolean(params.taskId || params.milestoneId),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
      toast.success('Comment added.');
    },
  });
}
