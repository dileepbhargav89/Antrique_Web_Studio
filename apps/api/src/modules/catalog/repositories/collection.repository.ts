import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Same shape as category.repository.ts — see that file's own comment for
// the full reasoning (data-access only, structural tenant isolation,
// $transaction-backed pagination).
@Injectable()
export class CollectionRepository extends BaseRepository<PrismaService['collection']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.collection);
  }

  findActiveById(
    id: string,
    tenantId: string,
  ): ReturnType<PrismaService['collection']['findFirst']> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.CollectionWhereInput,
    orderBy: Prisma.CollectionOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CollectionWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
