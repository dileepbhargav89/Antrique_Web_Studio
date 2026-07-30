import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// `Notification` (Phase 1.1B, reused wholesale — see schema.prisma's own
// updated comment) has no soft-delete column at all — `findById()` is
// tenant-scoped only, no `deletedAt` filter. `NotificationTemplate`'s own
// data-access lives here too, not in a separate repository — this
// milestone's own "Repository Layer" list names exactly three
// repositories (Notification/Audit/Dashboard), the same "line-item/
// lookup shaped, no independent repository" precedent
// `LeadSource`/`PaymentMethod` already established.
@Injectable()
export class NotificationRepository extends BaseRepository<PrismaService['notification']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.notification);
  }

  findById(id: string, tenantId: string) {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.NotificationWhereInput,
    orderBy: Prisma.NotificationOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.NotificationWhereInput = { ...where, tenantId };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Phase 10, Module 1 (Performance) — opt-in cursor pagination, same
  // reasoning as AuditRepository.findManyByCursor() (id < cursor, id
  // DESC — equivalent to createdAt DESC for a uuid(7) PK, no new index
  // needed).
  async findManyByCursor(
    tenantId: string,
    where: Prisma.NotificationWhereInput,
    cursor: string | undefined,
    take: number,
  ) {
    const scopedWhere: Prisma.NotificationWhereInput = {
      ...where,
      tenantId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    };
    const rows = await this.delegate.findMany({
      where: scopedWhere,
      orderBy: { id: 'desc' },
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    // `hasMore` is only true when `items.length === take` (>= 1, per
    // PaginationQueryDto's own @Min(1)), so `items` is always non-empty
    // here — TS can't infer that invariant through the ternary above.
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  // Phase 10, Module 1 (Performance) — this module's one real batch
  // write: marking read has no per-row business logic (unlike task
  // creation's TaskService.create() side effects), so a plain
  // `updateMany()` is safe. Scoped to `readAt: null` — already-read
  // notifications are left untouched, not re-stamped.
  async markAllRead(tenantId: string, userId?: string): Promise<number> {
    const result = await this.delegate.updateMany({
      where: { tenantId, ...(userId ? { userId } : {}), readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  // Used by NotificationService to resolve a `templateKey`+`channel`
  // into a `NotificationTemplate`'s own `subject`/`body` — the one
  // narrow existence-check/lookup this milestone needs, reached directly
  // rather than via a whole separate repository, the same pattern
  // `LeadRepository.findActiveLeadSourceById()` (Milestone 9) already
  // established.
  findActiveTemplateByKey(
    key: string,
    channel: Prisma.NotificationTemplateWhereInput['channel'],
    tenantId: string,
  ) {
    return this.prisma.notificationTemplate.findFirst({
      where: { key, channel, tenantId, deletedAt: null, isActive: true },
    });
  }
}
