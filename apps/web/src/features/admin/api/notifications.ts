import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Notification, NotificationListParams } from '@/types/api/admin';

export function listNotifications(
  params: NotificationListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Notification>> {
  return apiClient.get<PaginatedResponse<Notification>, NotificationListParams>('notifications', {
    query: params,
    signal,
  });
}

export function retryNotification(id: string): Promise<Notification> {
  return apiClient.post<Notification>(`notifications/${id}/retry`, {});
}
