import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// `Payment` is append-only (Phase 1.1A/1.1B — `UPDATE`/`DELETE` are
// revoked at the database-privilege level, see schema.prisma's own
// comment) — this repository exposes no update method at all;
// `PaymentService` only ever calls `create()`/`createInTx()`.
// `PaymentAllocation`'s own data-access methods live here too, not in a
// separate repository — this milestone's own "Repository Layer" list
// names exactly three repositories (Invoice/Payment/Tax), the same
// "line-item shaped, no independent repository" precedent
// `OrderItem`/`OrderStatusHistory` already established for entities
// created only as nested writes under their own aggregate root's
// service.
@Injectable()
export class PaymentRepository extends BaseRepository<PrismaService['payment']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.payment);
  }

  // No soft-delete column on `Payment` (append-only) — tenant-scoped
  // only, same shape `CustomerActivity`'s own `findActiveById()`-less
  // reads use.
  findById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.PaymentWhereInput,
    orderBy: Prisma.PaymentOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.PaymentWhereInput = { ...where, tenantId };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.PaymentUncheckedCreateInput) {
    return tx.payment.create({ data });
  }

  findByIdInTx(tx: Prisma.TransactionClient, id: string, tenantId: string) {
    return tx.payment.findFirst({ where: { id, tenantId } });
  }

  // "Payment allocations cannot exceed payment amount" — the current
  // allocated total, read inside the SAME transaction as any new
  // allocation being considered, so the check sees a consistent
  // snapshot. Proportionate for this milestone's own low-concurrency
  // admin-driven flow — no row lock beyond the transaction itself; see
  // docs/implementation/decisions.md.
  async sumAllocationsInTx(
    tx: Prisma.TransactionClient,
    paymentId: string,
    tenantId: string,
  ): Promise<Prisma.Decimal> {
    const result = await tx.paymentAllocation.aggregate({
      where: { paymentId, tenantId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  createAllocationInTx(
    tx: Prisma.TransactionClient,
    data: Prisma.PaymentAllocationUncheckedCreateInput,
  ) {
    return tx.paymentAllocation.create({ data });
  }

  findAllocationsForPayment(paymentId: string, tenantId: string) {
    return this.prisma.paymentAllocation.findMany({
      where: { paymentId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Used by PaymentService to resolve `paymentMethodId` into the
  // required NOT NULL `method` text column (see record-payment.dto.ts's
  // own comment) — a small existence-check reaching
  // `this.prisma.paymentMethod` directly rather than a whole separate
  // repository, since `PaymentMethod` has no repository/controller of
  // its own this milestone (see docs/implementation/decisions.md), the
  // same pattern `LeadRepository.findActiveLeadSourceById()` (Milestone
  // 9) already established.
  findActivePaymentMethodById(id: string, tenantId: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }
}
