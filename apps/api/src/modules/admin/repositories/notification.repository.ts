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
