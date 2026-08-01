import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Data-access only — same shape as category.repository.ts. Originally
// create-only (see this file's own former header comment); the list/get/
// convert routes added alongside GET /contact-requests and
// POST /contact-requests/:id/convert need findActiveById/findManyPaginated/
// updateInTx too now, the same "narrow, needs-driven growth" precedent
// LeadRepository's own header comment documents.
@Injectable()
export class ContactRequestRepository extends BaseRepository<PrismaService['contactRequest']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.contactRequest);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.ContactRequestWhereInput,
    orderBy: Prisma.ContactRequestOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.ContactRequestWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  updateInTx(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.ContactRequestUncheckedUpdateInput,
  ) {
    return tx.contactRequest.update({ where: { id }, data });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }
}
