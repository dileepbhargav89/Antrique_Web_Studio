import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { AuditRepository } from './repositories/audit.repository';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { MarkNotificationsReadResponseDto } from './dto/mark-notifications-read-response.dto';
import { toNotificationResponseDto } from './mappers/notification.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { NOTIFICATION_RETRYABLE_STATUSES } from './constants/admin.constant';
import { NotificationChannel, NotificationStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  channel?: NotificationChannel;
  title?: string;
  body?: string;
  templateKey?: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
}

// Business logic + repository orchestration + mapping. This milestone's
// own "Notifications" business responsibilities:
// - "Create" — either an explicit `title`/`body`, OR a `templateKey`
//   resolved via `NotificationRepository.findActiveTemplateByKey()`
//   (mirrors `LeadService.resolveSourceText()`'s own dual-input
//   pattern). Starts at `PENDING`. Not exposed via a public REST route
//   this milestone — this milestone's own "Notifications" Controllers
//   list is "List, Get, Retry placeholder" only; every prior real
//   notification will be created by a FUTURE feature's own business
//   event (an order shipping, an invoice being paid, ...), which
//   doesn't exist yet — the same "real, tested capability with no
//   controller route because no real caller needs one yet" precedent
//   Milestone 7's own `consumeReservation()` established, NOT the
//   "add a route because leaving it dead contradicts an explicit rule"
//   precedent Milestones 9/10 used elsewhere (nothing here is
//   unreachable — this service is exercised directly by its own tests).
// - "Queue" — PENDING -> QUEUED.
// - "Mark sent" — QUEUED -> SENT, stamps `sentAt`.
// - "Mark failed" — any non-terminal status -> FAILED, stamps
//   `failedAt`/`lastError`.
// - "Retry placeholder" — the ONE action this milestone exposes
//   publicly (`POST /notifications/:id/retry`): resets a FAILED
//   notification back to `PENDING` (ready to be queued again),
//   increments `retryCount`. A genuine placeholder, not a real re-send —
//   this milestone's own "Do NOT Implement: Email delivery providers,
//   SMS providers, Push notifications" means nothing actually
//   re-delivers the message; the same "validates, then reports what it
//   actually did, no pretending" honesty `PaymentService.refundPlaceholder()`
//   (Milestone 10) already established, just without throwing — retrying
//   the STATE transition genuinely is real and complete, only the
//   downstream delivery attempt is out of scope.
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async create(
    params: CreateNotificationParams,
    tenantId: string,
  ): Promise<NotificationResponseDto> {
    if (!params.templateKey && !params.title) {
      throw new BadRequestException('Either templateKey or title must be provided');
    }
    const channel = params.channel ?? NotificationChannel.IN_APP;

    let title = params.title;
    let body = params.body;
    if (params.templateKey) {
      const template = await this.notificationRepository.findActiveTemplateByKey(
        params.templateKey,
        channel,
        tenantId,
      );
      if (!template) {
        throw new BadRequestException(
          `Notification template "${params.templateKey}" (${channel}) not found`,
        );
      }
      title = template.subject;
      body = template.body;
    }

    const notification = await this.notificationRepository.create({
      data: {
        tenantId,
        userId: params.userId,
        type: params.type,
        channel,
        title: title!,
        body,
        relatedResourceType: params.relatedResourceType,
        relatedResourceId: params.relatedResourceId,
        status: NotificationStatus.PENDING,
      },
    });
    return toNotificationResponseDto(notification);
  }

  async queue(id: string, tenantId: string): Promise<NotificationResponseDto> {
    const existing = await this.assertExists(id, tenantId);
    if (existing.status !== NotificationStatus.PENDING) {
      throw new BadRequestException(
        `Notification ${id} cannot be queued from status ${existing.status}`,
      );
    }
    const updated = await this.notificationRepository.update({
      where: { id },
      data: { status: NotificationStatus.QUEUED },
    });
    return toNotificationResponseDto(updated);
  }

  async markSent(id: string, tenantId: string): Promise<NotificationResponseDto> {
    const existing = await this.assertExists(id, tenantId);
    if (existing.status !== NotificationStatus.QUEUED) {
      throw new BadRequestException(
        `Notification ${id} cannot be marked sent from status ${existing.status}`,
      );
    }
    const updated = await this.notificationRepository.update({
      where: { id },
      data: { status: NotificationStatus.SENT, sentAt: new Date() },
    });
    return toNotificationResponseDto(updated);
  }

  async markFailed(id: string, tenantId: string, error?: string): Promise<NotificationResponseDto> {
    const existing = await this.assertExists(id, tenantId);
    if (existing.status === NotificationStatus.SENT) {
      throw new BadRequestException(
        `Notification ${id} has already been sent and cannot be marked failed`,
      );
    }
    const updated = await this.notificationRepository.update({
      where: { id },
      data: { status: NotificationStatus.FAILED, failedAt: new Date(), lastError: error },
    });
    return toNotificationResponseDto(updated);
  }

  // "Retry placeholder" — the one publicly-exposed mutation this
  // milestone builds. `note` (`RetryNotificationDto`'s own field) has
  // nowhere to live on `Notification` itself (no schema column for it —
  // this is an admin ACTION being taken, not a property of the
  // notification), so it's recorded on the `AuditLog` row this method
  // writes instead — CLAUDE.md's own non-negotiable "every feature ships
  // with... audit logging" rule, applied to this milestone's one real
  // mutation-with-a-route.
  async retry(id: string, tenantId: string, note?: string): Promise<NotificationResponseDto> {
    const existing = await this.assertExists(id, tenantId);
    if (!(NOTIFICATION_RETRYABLE_STATUSES as readonly string[]).includes(existing.status)) {
      throw new BadRequestException(
        `Notification ${id} cannot be retried from status ${existing.status}`,
      );
    }
    const updated = await this.notificationRepository.update({
      where: { id },
      data: {
        status: NotificationStatus.PENDING,
        retryCount: { increment: 1 },
        failedAt: null,
        lastError: null,
      } satisfies Prisma.NotificationUncheckedUpdateInput,
    });
    await this.auditRepository.recordEvent({
      tenantId,
      action: 'notification.retry',
      resourceType: 'notification',
      resourceId: id,
      before: { status: existing.status, retryCount: existing.retryCount } as Prisma.InputJsonValue,
      after: {
        status: updated.status,
        retryCount: updated.retryCount,
        note: note ?? null,
      } as Prisma.InputJsonValue,
    });
    return toNotificationResponseDto(updated);
  }

  // Phase 10, Module 1 (Performance) — the "Batch operations" deliverable:
  // one real, safe bulk write (see MarkNotificationsReadDto's own
  // comment for why this was the one candidate that qualified), audit-
  // logged like every other mutation this service exposes (retry()).
  async markAllRead(tenantId: string, userId?: string): Promise<MarkNotificationsReadResponseDto> {
    const count = await this.notificationRepository.markAllRead(tenantId, userId);
    await this.auditRepository.recordEvent({
      tenantId,
      action: 'notification.mark_all_read',
      resourceType: 'notification',
      after: { count, userId: userId ?? null } as Prisma.InputJsonValue,
    });
    return new MarkNotificationsReadResponseDto(count);
  }

  async findById(id: string, tenantId: string): Promise<NotificationResponseDto> {
    const notification = await this.assertExists(id, tenantId);
    return toNotificationResponseDto(notification);
  }

  async list(
    query: NotificationListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.NotificationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Phase 10, Module 1 (Performance) — opt-in cursor mode, additive:
    // `page`/`limit` behavior below is completely unchanged when `cursor`
    // is absent. See CursorPaginationQueryDto's own comment.
    if (query.cursor !== undefined) {
      const { items, nextCursor } = await this.notificationRepository.findManyByCursor(
        tenantId,
        where,
        query.cursor,
        limit,
      );
      return new PaginatedResponseDto(
        items.map(toNotificationResponseDto),
        items.length,
        page,
        limit,
        nextCursor,
      );
    }

    const { items, total } = await this.notificationRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toNotificationResponseDto), total, page, limit);
  }

  private async assertExists(id: string, tenantId: string) {
    const notification = await this.notificationRepository.findById(id, tenantId);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }
}
