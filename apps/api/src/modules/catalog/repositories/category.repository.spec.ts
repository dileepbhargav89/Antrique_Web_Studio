import { CategoryRepository } from './category.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Same reasoning as modules/auth/repositories/auth.repository.spec.ts — a
// plain fake exposing `prisma.category` plus a fake `$transaction` (array
// form: resolves each promise in the array and returns the results
// tuple, the same semantics the real Prisma client's array-form
// `$transaction()` has) is enough to prove the wiring, no real
// PrismaService/Postgres involved.
function createFakePrisma() {
  const category = {
    findUnique: jest.fn(async () => null),
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    delete: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  return {
    category,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CategoryRepository(prisma);
}

describe('CategoryRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to the given tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('cat-1', TENANT_ID);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', tenantId: TENANT_ID, deletedAt: null },
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
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { name: 'asc' },
        skip: 10,
        take: 20,
      });
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', tenantId: TENANT_ID, deletedAt: null },
      });
    });

    it('returns { items, total } from the transaction results', async () => {
      const prisma = createFakePrisma();
      (prisma.category.findMany as jest.Mock).mockResolvedValue([{ id: 'cat-1' }]);
      (prisma.category.count as jest.Mock).mockResolvedValue(1);
      const repository = createRepository(prisma);

      const result = await repository.findManyPaginated(TENANT_ID, {}, {}, 0, 20);

      expect(result).toEqual({ items: [{ id: 'cat-1' }], total: 1 });
    });

    it('cannot be scoped to a different tenant than the one passed in — always merges the given tenantId', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const otherTenantId = '00000000-0000-7000-8000-000000000099';

      await repository.findManyPaginated(otherTenantId, {}, {}, 0, 20);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: otherTenantId }) }),
      );
    });
  });
});
