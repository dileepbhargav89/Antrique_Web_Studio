'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listFollowUps, completeFollowUp, cancelFollowUp, reopenFollowUp } from '../api/follow-ups';
import { followUpKeys } from '../api/query-keys';
import type { FollowUpListParams } from '@/types/api/crm';

export function useFollowUps(params: FollowUpListParams) {
  return useQuery({
    queryKey: followUpKeys.list(params),
    queryFn: ({ signal }) => listFollowUps(params, signal),
  });
}

export function useFollowUpActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });

  const complete = useMutation({
    mutationFn: (id: string) => completeFollowUp(id),
    onSuccess: () => {
      invalidate();
      toast.success('Follow-up marked complete.');
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFollowUp(id),
    onSuccess: () => {
      invalidate();
      toast.success('Follow-up cancelled.');
    },
  });
  const reopen = useMutation({
    mutationFn: (id: string) => reopenFollowUp(id),
    onSuccess: () => {
      invalidate();
      toast.success('Follow-up reopened.');
    },
  });

  return { complete, cancel, reopen };
}
