import { NotificationChannel, NotificationStatus } from '../../../../generated/prisma/enums';

export class NotificationResponseDto {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly type: string,
    readonly channel: NotificationChannel,
    readonly title: string,
    readonly body: string | null,
    readonly relatedResourceType: string | null,
    readonly relatedResourceId: string | null,
    readonly readAt: Date | null,
    readonly dismissedAt: Date | null,
    readonly status: NotificationStatus,
    readonly sentAt: Date | null,
    readonly failedAt: Date | null,
    readonly retryCount: number,
    readonly lastError: string | null,
    readonly createdAt: Date,
  ) {}
}
