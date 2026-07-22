import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma, OrderStatus } from '../../../../generated/prisma/client';

const ORDER_RELATIONS_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

// The aggregate root for this milestone's central entity — `Order` —
// with `OrderItem`/`OrderStatusHistory` created only as nested data
// (both line-item shaped, no repository/controller of their own; see
// schema.prisma's own comments). `findActiveById()` includes the full
// detail (items + ordered status history); `findManyPaginated()`
// deliberately does not (a lighter list/summary view), same
// detail-vs-list split `product.repository.ts` established in
// Milestone 5.
//
// `runInTransaction()` is the one genuinely new shape this repository
// introduces: OrderService.create()/cancel() both need to reserve/
// release inventory (via `InventoryService`, a DIFFERENT module) and
// write Order/OrderItem/OrderStatusHistory rows as ONE atomic unit
// ("Execute everything within a single transaction," this milestone's
// own requirement) — that's only possible if BOTH sides run against the
// SAME transaction client. This thin wrapper is the one place
// OrderRepository hands a `Prisma.TransactionClient` back to the calling
// service; every actual `tx.<model>.<method>()` call still lives in a
// named repository method below (`createInTx()`/`addStatusHistoryInTx()`/
// `updateStatusInTx()`), never inline in the service — see
// docs/architecture/domain-module-guide.md §19 for the fuller reasoning.
@Injectable()
export class OrderRepository extends BaseRepository<PrismaService['order']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.order);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: ORDER_RELATIONS_INCLUDE,
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.OrderWhereInput,
    orderBy: Prisma.OrderOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.OrderWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  // Creates the Order with its nested OrderItems and initial
  // OrderStatusHistory (DRAFT, `previousStatus: null`) in one nested
  // Prisma write — called from within the transaction OrderService opens
  // via `runInTransaction()`, AFTER inventory has already been reserved
  // for every item (so each item's `inventoryReservationId` is already
  // known).
  createInTx(tx: Prisma.TransactionClient, data: Prisma.OrderUncheckedCreateInput) {
    return tx.order.create({ data, include: ORDER_RELATIONS_INCLUDE });
  }

  addStatusHistoryInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    status: OrderStatus,
    previousStatus: OrderStatus | null,
    note?: string,
  ) {
    return tx.orderStatusHistory.create({
      data: { tenantId, orderId, status, previousStatus, note },
    });
  }

  updateStatusInTx(tx: Prisma.TransactionClient, orderId: string, status: OrderStatus) {
    return tx.order.update({ where: { id: orderId }, data: { status } });
  }

  // Milestone 11 — "Orders: Revenue, Order count, Average order value"
  // analytics. Excludes CANCELLED (never real revenue) and DRAFT (not
  // yet a genuine order — a customer's own in-progress cart); everything
  // else (PENDING through COMPLETED) counts as a real placed order for
  // this purpose. `averageOrderValue` is computed from the same two
  // aggregate numbers, not a separate query.
  async getRevenueSummary(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{ orderCount: number; revenue: Prisma.Decimal; averageOrderValue: Prisma.Decimal }> {
    const result = await this.delegate.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] },
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      _count: { _all: true },
      _sum: { total: true },
    });
    const orderCount = result._count._all;
    const revenue = result._sum.total ?? new Prisma.Decimal(0);
    const averageOrderValue =
      orderCount > 0 ? revenue.div(orderCount).toDecimalPlaces(2) : new Prisma.Decimal(0);
    return { orderCount, revenue, averageOrderValue };
  }
}
