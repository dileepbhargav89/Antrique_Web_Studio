import { InventoryRepository } from './inventory.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  Prisma,
  InventoryTransactionType,
  ReservationStatus,
} from '../../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// $transaction supports both the array form (findManyPaginated/
// findTransactionsPaginated) and the interactive callback form
// (applyStockChange/reserveStock/releaseReservation/consumeReservation)
// — the callback is invoked with this SAME fake object standing in for
// the transaction-scoped client, since the repository only calls
// `tx.<model>.<method>()`, identical in shape to `this.prisma.<model>.<method>()`.
function createFakePrisma() {
  const fakePrisma: Record<string, unknown> = {
    inventoryItem: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({
        id: 'item-1',
        onHand: new Prisma.Decimal(10),
        reserved: new Prisma.Decimal(2),
      })),
      count: jest.fn(async () => 0),
    },
    inventoryTransaction: {
      create: jest.fn(async () => ({}) as unknown),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    },
    inventoryReservation: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({}) as unknown),
    },
    productVariant: { findFirst: jest.fn(async () => null) },
    fabric: { findFirst: jest.fn(async () => null) },
  };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  // Milestone 12 — `getStockValuationAggregate()`/`findLowStockItems()`
  // call `$queryRaw` as a tagged template (`` prisma.$queryRaw`...` ``);
  // a tagged-template call is just a regular function call under the
  // hood (`$queryRaw(strings, ...values)`), so a plain `jest.fn()`
  // stand-in works with zero special handling — only the resolved value
  // matters for these specs, not the SQL text itself.
  fakePrisma.$queryRaw = jest.fn(async () => []);
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new InventoryRepository(prisma);
}

describe('InventoryRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('item-1', TENANT_ID);

      expect(prisma.inventoryItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findActiveByWarehouseAndVariant() / findActiveByWarehouseAndFabric()', () => {
    it('scope the lookup to the given warehouse and the respective FK', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByWarehouseAndVariant('wh-1', 'var-1', TENANT_ID);
      expect(prisma.inventoryItem.findFirst).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          productVariantId: 'var-1',
          tenantId: TENANT_ID,
          deletedAt: null,
        },
      });

      await repository.findActiveByWarehouseAndFabric('wh-1', 'fab-1', TENANT_ID);
      expect(prisma.inventoryItem.findFirst).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', fabricId: 'fab-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('applyStockChange()', () => {
    it('returns null without writing anything when the item does not exist for this tenant', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.applyStockChange('missing', TENANT_ID, {
        onHandDelta: '10',
        type: InventoryTransactionType.RECEIPT,
      });

      expect(result).toBeNull();
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('atomically increments the counters and logs a transaction with the resulting snapshot', async () => {
      const prisma = createFakePrisma();
      (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({ id: 'item-1' });
      const repository = createRepository(prisma);

      await repository.applyStockChange('item-1', TENANT_ID, {
        onHandDelta: '10',
        type: InventoryTransactionType.RECEIPT,
        reason: 'Initial stock',
      });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { onHand: { increment: '10' }, reserved: { increment: 0 } },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          inventoryItemId: 'item-1',
          type: InventoryTransactionType.RECEIPT,
          onHandDelta: '10',
          reservedDelta: 0,
          onHandAfter: expect.anything(),
          reservedAfter: expect.anything(),
          reason: 'Initial stock',
        }),
      });
    });
  });

  describe('reserveStock()', () => {
    it('returns null when the item does not exist for this tenant', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.reserveStock('missing', TENANT_ID, { quantity: '3' });

      expect(result).toBeNull();
      expect(prisma.inventoryReservation.create).not.toHaveBeenCalled();
    });

    it('increments reserved, creates an ACTIVE reservation, and logs a RESERVATION transaction', async () => {
      const prisma = createFakePrisma();
      (prisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({ id: 'item-1' });
      const repository = createRepository(prisma);

      await repository.reserveStock('item-1', TENANT_ID, { quantity: '3', reference: 'Demo hold' });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { reserved: { increment: '3' } },
      });
      expect(prisma.inventoryReservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          inventoryItemId: 'item-1',
          quantity: '3',
          status: ReservationStatus.ACTIVE,
          reference: 'Demo hold',
        }),
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: InventoryTransactionType.RESERVATION,
          reservedDelta: '3',
        }),
      });
    });
  });

  describe('releaseReservation()', () => {
    it('returns null when no ACTIVE reservation with this id exists for this tenant', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.releaseReservation('missing', TENANT_ID);

      expect(result).toBeNull();
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('decrements reserved (onHand untouched), marks the reservation RELEASED, logs a RELEASE transaction', async () => {
      const prisma = createFakePrisma();
      (prisma.inventoryReservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'res-1',
        inventoryItemId: 'item-1',
        quantity: new Prisma.Decimal(3),
      });
      const repository = createRepository(prisma);

      await repository.releaseReservation('res-1', TENANT_ID);

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { reserved: { decrement: expect.anything() } },
      });
      expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.RELEASED },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: InventoryTransactionType.RELEASE }),
      });
    });
  });

  describe('consumeReservation()', () => {
    it('decrements BOTH onHand and reserved, marks the reservation CONSUMED, logs a CONSUMPTION transaction', async () => {
      const prisma = createFakePrisma();
      (prisma.inventoryReservation.findFirst as jest.Mock).mockResolvedValue({
        id: 'res-1',
        inventoryItemId: 'item-1',
        quantity: new Prisma.Decimal(3),
      });
      const repository = createRepository(prisma);

      await repository.consumeReservation('res-1', TENANT_ID);

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          onHand: { decrement: expect.anything() },
          reserved: { decrement: expect.anything() },
        },
      });
      expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.CONSUMED },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: InventoryTransactionType.CONSUMPTION }),
      });
    });
  });

  describe('productVariantExistsForTenant() / fabricExistsForTenant()', () => {
    it('return true when a matching row is found, false otherwise', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      expect(await repository.productVariantExistsForTenant('var-1', TENANT_ID)).toBe(false);
      (prisma.productVariant.findFirst as jest.Mock).mockResolvedValue({ id: 'var-1' });
      expect(await repository.productVariantExistsForTenant('var-1', TENANT_ID)).toBe(true);

      expect(await repository.fabricExistsForTenant('fab-1', TENANT_ID)).toBe(false);
      (prisma.fabric.findFirst as jest.Mock).mockResolvedValue({ id: 'fab-1' });
      expect(await repository.fabricExistsForTenant('fab-1', TENANT_ID)).toBe(true);
    });
  });

  // Milestone 12 (Performance Engineering) — both rewritten from
  // `findMany()` + application-code reduce/filter to a single `$queryRaw`
  // that does the aggregation/comparison in Postgres itself. See each
  // method's own header comment in inventory.repository.ts.
  describe('getStockValuationAggregate()', () => {
    it('delegates to $queryRaw and returns its single summary row', async () => {
      const prisma = createFakePrisma();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { itemCount: 2, valuation: new Prisma.Decimal('6225.00') },
      ]);
      const repository = createRepository(prisma);

      const result = await repository.getStockValuationAggregate(TENANT_ID);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ itemCount: 2, valuation: new Prisma.Decimal('6225.00') });
    });
  });

  describe('findLowStockItems()', () => {
    it('delegates to $queryRaw and returns whatever rows come back (the WHERE clause does the filtering)', async () => {
      const prisma = createFakePrisma();
      const lowStockRow = {
        id: 'item-1',
        onHand: new Prisma.Decimal(2),
        reorderPoint: new Prisma.Decimal(5),
      };
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([lowStockRow]);
      const repository = createRepository(prisma);

      const result = await repository.findLowStockItems(TENANT_ID);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual([lowStockRow]);
    });
  });
});
