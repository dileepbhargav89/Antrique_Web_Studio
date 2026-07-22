import { FabricRepository } from './fabric.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Same reasoning as modules/catalog/repositories/category.repository.spec.ts
// — a plain fake exposing `prisma.fabric`/`prisma.productFabric` plus a
// fake `$transaction` is enough to prove the wiring, no real
// PrismaService/Postgres involved.
function createFakePrisma() {
  const fabric = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const productFabric = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  return {
    fabric,
    productFabric,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new FabricRepository(prisma);
}

describe('FabricRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows, with images included', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('fab-1', TENANT_ID);

      expect(prisma.fabric.findFirst).toHaveBeenCalledWith({
        where: { id: 'fab-1', tenantId: TENANT_ID, deletedAt: null },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
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
        10,
        20,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.fabric.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { name: 'asc' },
        skip: 10,
        take: 20,
      });
    });

    it('cannot be scoped to a different tenant than the one passed in', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const otherTenantId = '00000000-0000-7000-8000-000000000099';

      await repository.findManyPaginated(otherTenantId, {}, {}, 0, 20);

      expect(prisma.fabric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: otherTenantId }) }),
      );
    });
  });

  describe('setProductLinks()', () => {
    it('deletes existing links then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.setProductLinks(TENANT_ID, 'fab-1', ['prod-1', 'prod-2']);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.productFabric.deleteMany).toHaveBeenCalledWith({
        where: { fabricId: 'fab-1', tenantId: TENANT_ID },
      });
      expect(prisma.productFabric.createMany).toHaveBeenCalledWith({
        data: [
          { tenantId: TENANT_ID, productId: 'prod-1', fabricId: 'fab-1' },
          { tenantId: TENANT_ID, productId: 'prod-2', fabricId: 'fab-1' },
        ],
      });
    });
  });
});
