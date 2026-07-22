import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// `DashboardWidget` — full CRUD-shaped data access (this milestone's own
// generic "Repository Layer" responsibilities: CRUD/Pagination/
// Filtering/Tenant isolation/Soft delete), even though no controller
// exposes a write route this milestone (see DashboardWidget's own
// schema.prisma comment) — `findActiveWidgets()` is the one method
// `DashboardService.overview()` actually calls; the rest exist for
// completeness and future consumption (seed data is the only writer for
// now).
@Injectable()
export class DashboardRepository extends BaseRepository<PrismaService['dashboardWidget']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.dashboardWidget);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  // The ordered, active widget set for a tenant's own dashboard overview
  // — `DashboardService.overview()`'s one real read consumer.
  findActiveWidgets(tenantId: string) {
    return this.delegate.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.DashboardWidgetWhereInput,
    orderBy: Prisma.DashboardWidgetOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.DashboardWidgetWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
