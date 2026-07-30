import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

@Injectable()
export class PromptTemplateRepository extends BaseRepository<PrismaService['promptTemplate']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.promptTemplate);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  findActiveByKey(key: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { key, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.PromptTemplateWhereInput,
    orderBy: Prisma.PromptTemplateOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.PromptTemplateWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
