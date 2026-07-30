'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listNotifications, retryNotification } from '../api/notifications';
import { notificationKeys } from '../api/query-keys';
import type { NotificationListParams } from '@/types/api/admin';

export function useNotifications(params: NotificationListParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => listNotifications(params, signal),
  });
}

export function useRetryNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      toast.success('Notification retried.');
    },
  });
}
