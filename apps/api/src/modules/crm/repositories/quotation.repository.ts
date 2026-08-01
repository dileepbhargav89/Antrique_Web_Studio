import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const QUOTATION_RELATIONS_INCLUDE = {
  items: { orderBy: { sortOrder: 'asc' as const } },
  paymentStages: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.QuotationInclude;

// The closest existing model to the brief's "Proposal" concept — see
// quotation.service.ts's own header comment. Same shape as
// invoice.repository.ts (its nearest sibling: both are "line items +
// totals" aggregate roots with a generated human-readable number) —
// `findActiveById()` includes items, `findManyPaginated()` deliberately
// doesn't (same detail-vs-list split).
@Injectable()
export class QuotationRepository extends BaseRepository<PrismaService['quotation']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.quotation);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: QUOTATION_RELATIONS_INCLUDE,
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.QuotationWhereInput,
    orderBy: Prisma.QuotationOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.QuotationWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // "Quotation numbers generated automatically" — same per-tenant-per-year
  // sequence pattern as InvoiceRepository.countForTenantAndYear() (a
  // plain count, not a gap-free sequence — proportionate for the same
  // low-concurrency admin-driven flow).
  countForTenantAndYear(tenantId: string, year: number): Promise<number> {
    return this.delegate.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
    });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.QuotationUncheckedCreateInput) {
    return tx.quotation.create({ data, include: QUOTATION_RELATIONS_INCLUDE });
  }

  updateInTx(tx: Prisma.TransactionClient, id: string, data: Prisma.QuotationUncheckedUpdateInput) {
    return tx.quotation.update({ where: { id }, data, include: QUOTATION_RELATIONS_INCLUDE });
  }

  // Update-with-item-replacement (UpdateQuotationDto.items) — deletes
  // every existing QuotationItem for this quotation, then relies on the
  // caller's own subsequent `updateInTx()` nested `items: { create }` to
  // recreate them, both inside the same transaction. Separate from
  // updateInTx() itself since not every update touches items.
  deleteItemsInTx(tx: Prisma.TransactionClient, quotationId: string) {
    return tx.quotationItem.deleteMany({ where: { quotationId } });
  }

  // Same replace-on-update shape as deleteItemsInTx() above, for
  // QuotationPaymentStage — UpdateQuotationDto.paymentStages follows the
  // identical "delete all, recreate via the caller's nested `create`"
  // pattern.
  deletePaymentStagesInTx(tx: Prisma.TransactionClient, quotationId: string) {
    return tx.quotationPaymentStage.deleteMany({ where: { quotationId } });
  }
}
