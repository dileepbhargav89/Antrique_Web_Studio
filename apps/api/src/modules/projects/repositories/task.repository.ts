import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

@Injectable()
export class TaskRepository extends BaseRepository<PrismaService['task']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.task);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.TaskWhereInput,
    orderBy: Prisma.TaskOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.TaskWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
