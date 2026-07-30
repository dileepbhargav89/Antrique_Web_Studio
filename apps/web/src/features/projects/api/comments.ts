import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Comment, CommentListParams, CreateCommentInput } from '@/types/api/projects';

export function listComments(
  params: CommentListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Comment>> {
  return apiClient.get<PaginatedResponse<Comment>, CommentListParams>('comments', {
    query: params,
    signal,
  });
}

export function createComment(input: CreateCommentInput): Promise<Comment> {
  return apiClient.post<Comment>('comments', input);
}
