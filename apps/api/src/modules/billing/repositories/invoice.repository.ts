import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { InvoiceStatus } from '../../../../generated/prisma/enums';

const INVOICE_RELATIONS_INCLUDE = {
  items: true,
} satisfies Prisma.InvoiceInclude;

// The aggregate root for this milestone's central entity — `Invoice` —
// reused wholesale from Phase 1.1A (see schema.prisma's own updated
// comment), this is its first real repository. `InvoiceItem` is
// created only as nested data (line-item shaped, no repository/
// controller of its own — same "no independent repository" precedent
// `OrderItem`/`QuotationItem` already established). `findActiveById()`
// includes the full detail (line items); `findManyPaginated()`
// deliberately does not — same detail-vs-list split every prior
// module's own aggregate-root repository already uses.
//
// `runInTransaction()`/`createInTx()`/`updateInTx()` — the same
// transaction-threading shape `OrderRepository`/`LeadRepository` already
// established (domain-module-guide.md §19/§20): `InvoiceService.createFromOrder()`
// creates the Invoice+InvoiceItems in one transaction; `PaymentService`
// needs to update an Invoice's own `amountPaid`/`status` in the SAME
// transaction as writing a `PaymentAllocation` row, from a DIFFERENT
// module's repository — this is the one place `InvoiceRepository` hands
// a `Prisma.TransactionClient` back to a calling service.
@Injectable()
export class InvoiceRepository extends BaseRepository<PrismaService['invoice']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.invoice);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: INVOICE_RELATIONS_INCLUDE,
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.InvoiceWhereInput,
    orderBy: Prisma.InvoiceOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.InvoiceWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // "Invoice numbers generated automatically" — InvoiceService's own
  // per-tenant-per-year sequence input. A plain count, not a real
  // gap-free sequence — proportionate for this milestone's own
  // low-concurrency admin-driven flow; see
  // docs/implementation/decisions.md.
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

  createInTx(tx: Prisma.TransactionClient, data: Prisma.InvoiceUncheckedCreateInput) {
    return tx.invoice.create({ data, include: INVOICE_RELATIONS_INCLUDE });
  }

  updateInTx(tx: Prisma.TransactionClient, id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    return tx.invoice.update({ where: { id }, data });
  }

  findActiveByIdInTx(tx: Prisma.TransactionClient, id: string, tenantId: string) {
    return tx.invoice.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  // Milestone 11 — "Billing: Outstanding invoices" analytics. "Outstanding"
  // = issued (SENT/OVERDUE — excludes DRAFT, not yet sent, and VOID,
  // never collectible) and not yet fully paid; `outstandingAmount` is
  // `sum(totalAmount) - sum(amountPaid)` over that same set (mathematically
  // identical to summing each row's own remaining balance, computed via
  // one `aggregate()` call rather than a per-row reduce in application
  // code).
  async getOutstandingSummary(
    tenantId: string,
  ): Promise<{ count: number; outstandingAmount: Prisma.Decimal }> {
    const result = await this.delegate.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      },
      _count: { _all: true },
      _sum: { totalAmount: true, amountPaid: true },
    });
    const totalAmount = result._sum.totalAmount ?? new Prisma.Decimal(0);
    const amountPaid = result._sum.amountPaid ?? new Prisma.Decimal(0);
    return { count: result._count._all, outstandingAmount: totalAmount.sub(amountPaid) };
  }

  // Milestone 11 — "Billing: Collection rate" analytics. Scoped to
  // issued invoices only (excludes DRAFT/VOID — never billed, never
  // collectible), optionally further scoped to a date range.
  async getCollectionSummary(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalAmount: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    collectionRate: Prisma.Decimal;
  }> {
    const result = await this.delegate.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.VOID] },
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      _sum: { totalAmount: true, amountPaid: true },
    });
    const totalAmount = result._sum.totalAmount ?? new Prisma.Decimal(0);
    const amountPaid = result._sum.amountPaid ?? new Prisma.Decimal(0);
    const collectionRate = totalAmount.gt(0)
      ? amountPaid.div(totalAmount).mul(100).toDecimalPlaces(2)
      : new Prisma.Decimal(0);
    return { totalAmount, amountPaid, collectionRate };
  }
}
