import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import {
  Prisma,
  InventoryTransactionType,
  ReservationStatus,
  InventoryItem,
} from '../../../../generated/prisma/client';

// Milestone 8 (Order Management & Checkout) — every stock-mutating method
// below now accepts an OPTIONAL trailing `tx: Prisma.TransactionClient`.
// `OrderService` creates an order and reserves inventory for every line
// "within a single transaction" (this milestone's own explicit
// requirement) — that's only achievable if InventoryService's own
// reservation call runs INSIDE the SAME database transaction
// `OrderRepository` opens, not a second, independent one (Prisma has no
// true nested-transaction support: a `$transaction()` called from inside
// another `$transaction()` callback, against the same top-level client,
// does not compose into one atomic unit). Each method's shape is
// unchanged when called WITHOUT `tx` (every Milestone 7 caller/spec
// keeps working exactly as before — it opens its own transaction, same
// as always); passing `tx` skips that and reuses the caller's own
// transaction context instead. The core logic is split into a private
// `*InTx()` method operating on whatever client it's given, so both
// paths share one implementation.
type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InventoryRepository extends BaseRepository<PrismaService['inventoryItem']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.inventoryItem);
  }

  findActiveById(
    id: string,
    tenantId: string,
  ): ReturnType<PrismaService['inventoryItem']['findFirst']> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  findActiveByWarehouseAndVariant(warehouseId: string, productVariantId: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { warehouseId, productVariantId, tenantId, deletedAt: null },
    });
  }

  findActiveByWarehouseAndFabric(warehouseId: string, fabricId: string, tenantId: string) {
    return this.delegate.findFirst({ where: { warehouseId, fabricId, tenantId, deletedAt: null } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.InventoryItemWhereInput,
    orderBy: Prisma.InventoryItemOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.InventoryItemWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // The core transactional stock mutation every InventoryService
  // operation (receive/adjust/reserve/release/consume) funnels through —
  // "Inventory math must remain transactional"/"Stock changes always
  // create transaction records" (Milestone 7's own requirements),
  // enforced structurally: the counter update and the ledger row are
  // written in ONE database transaction, so they can never drift apart,
  // and neither is ever written without the other.
  //
  // Uses Prisma's atomic `{ increment }` (a single `SET on_hand = on_hand
  // + $delta` statement Postgres executes against the CURRENT row value
  // at write time), not a read-then-write in application code — this is
  // what makes concurrent stock mutations race-free without explicit row
  // locking: two simultaneous adjustments both apply correctly regardless
  // of ordering, and the `reserved <= on_hand`/`on_hand >= 0` CHECK
  // constraints still catch whichever one WOULD have pushed a counter
  // invalid, translated by InventoryService via
  // `isCheckConstraintViolation()`. Returns `null` if the item doesn't
  // exist for this tenant (soft-deleted or wrong tenant) — the
  // transaction is still a no-op either way.
  async applyStockChange(
    inventoryItemId: string,
    tenantId: string,
    params: {
      onHandDelta?: string | number;
      reservedDelta?: string | number;
      type: InventoryTransactionType;
      reason?: string;
      referenceId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return this.applyStockChangeInTx(tx, inventoryItemId, tenantId, params);
    }
    return this.prisma.$transaction((innerTx) =>
      this.applyStockChangeInTx(innerTx, inventoryItemId, tenantId, params),
    );
  }

  private async applyStockChangeInTx(
    client: PrismaClientLike,
    inventoryItemId: string,
    tenantId: string,
    params: {
      onHandDelta?: string | number;
      reservedDelta?: string | number;
      type: InventoryTransactionType;
      reason?: string;
      referenceId?: string;
    },
  ) {
    const existing = await client.inventoryItem.findFirst({
      where: { id: inventoryItemId, tenantId, deletedAt: null },
    });
    if (!existing) {
      return null;
    }

    const onHandDelta = params.onHandDelta ?? 0;
    const reservedDelta = params.reservedDelta ?? 0;

    const updated = await client.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        onHand: { increment: onHandDelta },
        reserved: { increment: reservedDelta },
      },
    });

    await client.inventoryTransaction.create({
      data: {
        tenantId,
        inventoryItemId,
        type: params.type,
        onHandDelta,
        reservedDelta,
        onHandAfter: updated.onHand,
        reservedAfter: updated.reserved,
        reason: params.reason,
        referenceId: params.referenceId,
      },
    });

    return updated;
  }

  async findTransactionsPaginated(
    tenantId: string,
    where: Prisma.InventoryTransactionWhereInput,
    orderBy: Prisma.InventoryTransactionOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.InventoryTransactionWhereInput = { ...where, tenantId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({ where: scopedWhere, orderBy, skip, take }),
      this.prisma.inventoryTransaction.count({ where: scopedWhere }),
    ]);
    return { items, total };
  }

  findReservationById(id: string, tenantId: string) {
    return this.prisma.inventoryReservation.findFirst({ where: { id, tenantId } });
  }

  // Reserve: creates the InventoryReservation row (status ACTIVE),
  // increments the item's `reserved` counter, and logs a RESERVATION
  // transaction — all in ONE database transaction, same atomicity
  // discipline as applyStockChange() above. Returns `null` if the item
  // doesn't exist for this tenant.
  async reserveStock(
    inventoryItemId: string,
    tenantId: string,
    params: { quantity: string | number; reference?: string; notes?: string },
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return this.reserveStockInTx(tx, inventoryItemId, tenantId, params);
    }
    return this.prisma.$transaction((innerTx) =>
      this.reserveStockInTx(innerTx, inventoryItemId, tenantId, params),
    );
  }

  private async reserveStockInTx(
    client: PrismaClientLike,
    inventoryItemId: string,
    tenantId: string,
    params: { quantity: string | number; reference?: string; notes?: string },
  ) {
    const existing = await client.inventoryItem.findFirst({
      where: { id: inventoryItemId, tenantId, deletedAt: null },
    });
    if (!existing) {
      return null;
    }

    const item = await client.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { reserved: { increment: params.quantity } },
    });
    const reservation = await client.inventoryReservation.create({
      data: {
        tenantId,
        inventoryItemId,
        quantity: params.quantity,
        status: ReservationStatus.ACTIVE,
        reference: params.reference,
        notes: params.notes,
      },
    });
    await client.inventoryTransaction.create({
      data: {
        tenantId,
        inventoryItemId,
        type: InventoryTransactionType.RESERVATION,
        reservedDelta: params.quantity,
        onHandAfter: item.onHand,
        reservedAfter: item.reserved,
        reason: params.reference,
      },
    });

    return { item, reservation };
  }

  // Release: the reservation's `quantity` returns to available stock —
  // `reserved` decrements, `onHand` is untouched, status → RELEASED.
  // Returns `null` if no ACTIVE reservation with this id exists for this
  // tenant (already released/consumed, or belongs to another tenant).
  async releaseReservation(reservationId: string, tenantId: string, tx?: Prisma.TransactionClient) {
    if (tx) {
      return this.releaseReservationInTx(tx, reservationId, tenantId);
    }
    return this.prisma.$transaction((innerTx) =>
      this.releaseReservationInTx(innerTx, reservationId, tenantId),
    );
  }

  private async releaseReservationInTx(
    client: PrismaClientLike,
    reservationId: string,
    tenantId: string,
  ) {
    const reservation = await client.inventoryReservation.findFirst({
      where: { id: reservationId, tenantId, status: ReservationStatus.ACTIVE },
    });
    if (!reservation) {
      return null;
    }

    const item = await client.inventoryItem.update({
      where: { id: reservation.inventoryItemId },
      data: { reserved: { decrement: reservation.quantity } },
    });
    const updatedReservation = await client.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.RELEASED },
    });
    await client.inventoryTransaction.create({
      data: {
        tenantId,
        inventoryItemId: reservation.inventoryItemId,
        type: InventoryTransactionType.RELEASE,
        reservedDelta: reservation.quantity.negated(),
        onHandAfter: item.onHand,
        reservedAfter: item.reserved,
      },
    });

    return { item, reservation: updatedReservation };
  }

  // Consume: the reserved stock leaves inventory for good — both
  // `onHand` and `reserved` decrement by the reservation's quantity,
  // status → CONSUMED. Same "null if not an active reservation for this
  // tenant" contract as releaseReservation().
  async consumeReservation(reservationId: string, tenantId: string, tx?: Prisma.TransactionClient) {
    if (tx) {
      return this.consumeReservationInTx(tx, reservationId, tenantId);
    }
    return this.prisma.$transaction((innerTx) =>
      this.consumeReservationInTx(innerTx, reservationId, tenantId),
    );
  }

  private async consumeReservationInTx(
    client: PrismaClientLike,
    reservationId: string,
    tenantId: string,
  ) {
    const reservation = await client.inventoryReservation.findFirst({
      where: { id: reservationId, tenantId, status: ReservationStatus.ACTIVE },
    });
    if (!reservation) {
      return null;
    }

    const item = await client.inventoryItem.update({
      where: { id: reservation.inventoryItemId },
      data: {
        onHand: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity },
      },
    });
    const updatedReservation = await client.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CONSUMED },
    });
    await client.inventoryTransaction.create({
      data: {
        tenantId,
        inventoryItemId: reservation.inventoryItemId,
        type: InventoryTransactionType.CONSUMPTION,
        onHandDelta: reservation.quantity.negated(),
        reservedDelta: reservation.quantity.negated(),
        onHandAfter: item.onHand,
        reservedAfter: item.reserved,
      },
    });

    return { item, reservation: updatedReservation };
  }

  // Existence + tenant-ownership checks for the two entities
  // `InventoryItem`/`SupplierProduct` can reference (see this class's
  // own header comment for why these live here rather than behind a
  // cross-module repository import).
  async productVariantExistsForTenant(id: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.productVariant.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    return row !== null;
  }

  async fabricExistsForTenant(id: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.fabric.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }

  // Milestone 11 — "Inventory: Stock valuation" analytics. Only
  // variant-linked items carry a resolvable unit price this milestone
  // (`ProductVariant.price`) — fabric-linked items have no equivalent
  // per-unit cost column anywhere in this schema (`SupplierProduct.cost`
  // is per-supplier, not a single canonical unit cost), so they're
  // excluded from the valuation total rather than guessed at; see
  // docs/implementation/decisions.md.
  //
  // Milestone 12 (Performance Engineering) — REWRITTEN from a plain
  // `findMany()` + application-code `reduce()` (every variant-linked
  // item's own `onHand`/`price` pulled into Node, one row per SKU, just
  // to sum two columns) to a single `SUM(on_hand * price)` computed
  // in Postgres. Confirmed live (`check_raw_decimal.ts`, deleted after
  // use) that Prisma 7's `@prisma/adapter-pg` driver adapter returns
  // genuine `Prisma.Decimal` instances from `$queryRaw` for `numeric`
  // columns — identical to what the query builder returns — so this
  // carries zero precision risk and needs no manual reconstruction. Same
  // business result as before (verified against the old implementation
  // during this milestone's own validation pass), transferring exactly
  // one row over the wire instead of one row per variant-linked item.
  async getStockValuationAggregate(
    tenantId: string,
  ): Promise<{ itemCount: number; valuation: Prisma.Decimal }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ itemCount: number; valuation: Prisma.Decimal }>
    >`
      SELECT
        COUNT(*)::int AS "itemCount",
        COALESCE(SUM(ii.on_hand * pv.price), 0) AS "valuation"
      FROM inventory_items ii
      JOIN product_variants pv ON pv.id = ii.product_variant_id
      WHERE ii.tenant_id = ${tenantId}::uuid
        AND ii.deleted_at IS NULL
        AND ii.product_variant_id IS NOT NULL
    `;
    return rows[0]!;
  }

  // Milestone 11 — "Inventory: Low stock items" analytics.
  //
  // Milestone 12 (Performance Engineering) — REWRITTEN. `onHand <=
  // reorderPoint` is a column-to-column comparison Prisma's own `where`
  // filter API can't express (no cross-column `$expr`-style operator),
  // which the original implementation worked around by fetching EVERY
  // item with a `reorderPoint` set — for a warehouse tracking thousands
  // of SKUs, most of them comfortably above their reorder point, that
  // pulled the entire reference set into Node on every Dashboard
  // request just to discard most of it. Postgres has no such limitation
  // — `on_hand <= reorder_point` is a completely ordinary `WHERE`
  // predicate at the SQL level. Rewritten as a single parameterized
  // `$queryRaw`, column-aliased to the exact camelCase shape
  // `toInventoryItemResponseDto()` already expects, so only genuinely
  // low-stock rows ever leave the database — confirmed live that
  // `Decimal`/`Date` columns come back as real `Prisma.Decimal`/`Date`
  // instances (see `getStockValuationAggregate()`'s own comment). Selects
  // every `InventoryItem` scalar column (aliased to its camelCase field
  // name), not just the ones the response mapper happens to read today —
  // matching the FULL `InventoryItem` shape is what lets
  // `toInventoryItemResponseDto()` (typed against the real Prisma model)
  // keep working completely unchanged, with no special-cased mapper for
  // this one raw query.
  findLowStockItems(tenantId: string): Promise<InventoryItem[]> {
    return this.prisma.$queryRaw<InventoryItem[]>`
      SELECT
        id,
        tenant_id AS "tenantId",
        warehouse_id AS "warehouseId",
        product_variant_id AS "productVariantId",
        fabric_id AS "fabricId",
        on_hand AS "onHand",
        reserved,
        reorder_point AS "reorderPoint",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        created_by AS "createdBy",
        updated_by AS "updatedBy",
        version,
        deleted_at AS "deletedAt",
        deleted_by AS "deletedBy"
      FROM inventory_items
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND reorder_point IS NOT NULL
        AND on_hand <= reorder_point
    `;
  }
}
