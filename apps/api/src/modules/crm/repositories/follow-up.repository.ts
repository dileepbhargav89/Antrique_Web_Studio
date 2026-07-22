import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Data-access only. `runInTransaction()`/`updateInTx()` — same reasoning
// as `LeadRepository`'s own pair: "Automatic activity creation for...
// follow-up completion" (this milestone's own explicit business rule)
// needs `FollowUpService.complete()` to write the status change and its
// `CustomerActivity` row in one atomic unit.
@Injectable()
export class FollowUpRepository extends BaseRepository<PrismaService['followUpTask']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.followUpTask);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.FollowUpTaskWhereInput,
    orderBy: Prisma.FollowUpTaskOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.FollowUpTaskWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  updateInTx(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.FollowUpTaskUncheckedUpdateInput,
  ) {
    return tx.followUpTask.update({ where: { id }, data });
  }
}
