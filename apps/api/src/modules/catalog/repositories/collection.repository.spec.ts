import { CollectionRepository } from './collection.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Same shape as category.repository.spec.ts.
function createFakePrisma() {
  const collection = {
    findUnique: jest.fn(async () => null),
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    delete: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  return {
    collection,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CollectionRepository(prisma);
}

describe('CollectionRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to the given tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('col-1', TENANT_ID);

      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { id: 'col-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause and runs findMany+count in one $transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(TENANT_ID, {} as never, { name: 'asc' } as never, 0, 20);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.collection.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
    });

    it('returns { items, total } from the transaction results', async () => {
      const prisma = createFakePrisma();
      (prisma.collection.findMany as jest.Mock).mockResolvedValue([{ id: 'col-1' }]);
      (prisma.collection.count as jest.Mock).mockResolvedValue(1);
      const repository = createRepository(prisma);

      const result = await repository.findManyPaginated(TENANT_ID, {}, {}, 0, 20);

      expect(result).toEqual({ items: [{ id: 'col-1' }], total: 1 });
    });
  });
});
