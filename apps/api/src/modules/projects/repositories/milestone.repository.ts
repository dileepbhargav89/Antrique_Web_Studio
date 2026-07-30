import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma, MilestoneStatus } from '../../../../generated/prisma/client';

@Injectable()
export class MilestoneRepository extends BaseRepository<PrismaService['milestone']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.milestone);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.MilestoneWhereInput,
    orderBy: Prisma.MilestoneOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.MilestoneWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Backs ProjectDetailResponseDto's `completionPercent` — see
  // project.service.ts's own comment on why this is computed on read, not
  // a stored/denormalized column.
  async countCompletion(
    projectId: string,
    tenantId: string,
  ): Promise<{ total: number; approved: number }> {
    const [total, approved] = await this.prisma.$transaction([
      this.delegate.count({ where: { projectId, tenantId, deletedAt: null } }),
      this.delegate.count({
        where: { projectId, tenantId, deletedAt: null, status: MilestoneStatus.APPROVED },
      }),
    ]);
    return { total, approved };
  }
}
