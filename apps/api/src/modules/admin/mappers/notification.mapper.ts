import { Notification } from '../../../../generated/prisma/client';
import { NotificationResponseDto } from '../dto/notification-response.dto';

export function toNotificationResponseDto(notification: Notification): NotificationResponseDto {
  return new NotificationResponseDto(
    notification.id,
    notification.userId,
    notification.type,
    notification.channel,
    notification.title,
    notification.body,
    notification.relatedResourceType,
    notification.relatedResourceId,
    notification.readAt,
    notification.dismissedAt,
    notification.status,
    notification.sentAt,
    notification.failedAt,
    notification.retryCount,
    notification.lastError,
    notification.createdAt,
  );
}
