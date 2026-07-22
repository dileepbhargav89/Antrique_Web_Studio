import { WarehouseRepository } from './warehouse.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const warehouse = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const inventoryItem = {
    count: jest.fn(async () => 0),
  };
  return {
    warehouse,
    inventoryItem,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new WarehouseRepository(prisma);
}

describe('WarehouseRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('wh-1', TENANT_ID);

      expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'wh-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause and runs findMany+count in one $transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'ACTIVE' } as never,
        { name: 'asc' } as never,
        0,
        20,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.warehouse.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('hasActiveInventory()', () => {
    it('counts non-deleted items in the warehouse with positive onHand or reserved', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.hasActiveInventory('wh-1', TENANT_ID);

      expect(prisma.inventoryItem.count).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          tenantId: TENANT_ID,
          deletedAt: null,
          OR: [{ onHand: { gt: 0 } }, { reserved: { gt: 0 } }],
        },
      });
    });

    it('returns true when at least one matching item exists', async () => {
      const prisma = createFakePrisma();
      (prisma.inventoryItem.count as jest.Mock).mockResolvedValue(2);
      const repository = createRepository(prisma);

      expect(await repository.hasActiveInventory('wh-1', TENANT_ID)).toBe(true);
    });

    it('returns false when no matching item exists', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      expect(await repository.hasActiveInventory('wh-1', TENANT_ID)).toBe(false);
    });
  });
});
