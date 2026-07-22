import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Data-access only. "Notes never hard-delete" (this milestone's own
// explicit rule) is enforced entirely in CustomerNoteService — this
// repository exposes no method that issues a real SQL DELETE against
// this table; `remove()` in the service always resolves to a plain
// `update({ data: { deletedAt } })` call through the inherited
// `BaseRepository.update()`.
@Injectable()
export class CustomerNoteRepository extends BaseRepository<PrismaService['customerNote']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.customerNote);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.CustomerNoteWhereInput,
    orderBy: Prisma.CustomerNoteOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CustomerNoteWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
