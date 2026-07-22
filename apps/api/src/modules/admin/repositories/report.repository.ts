import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// A 4th repository beyond this milestone's own named "Repository Layer"
// list (Notification/Audit/Dashboard) — added because `ScheduledReport`
// IS a named "Core entity" with its own Controllers ("Generate, List,
// Download metadata") but no repository was named for it; without one
// it would be dead schema, the same class of judgment call
// `CustomerTagRepository` (Milestone 9) already established. No update
// method at all — "Reports are immutable after generation" (this
// milestone's own explicit rule), enforced structurally here AND at the
// database-privilege level (`UPDATE`/`DELETE` revoked on
// `scheduled_reports`).
@Injectable()
export class ReportRepository extends BaseRepository<PrismaService['scheduledReport']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.scheduledReport);
  }

  findById(id: string, tenantId: string) {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.ScheduledReportWhereInput,
    orderBy: Prisma.ScheduledReportOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.ScheduledReportWhereInput = { ...where, tenantId };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
