import { TaxRepository } from './tax.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const taxRate = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { taxRate };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new TaxRepository(prisma);
}

describe('TaxRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('tax-1', TENANT_ID);

      expect(prisma.taxRate.findFirst).toHaveBeenCalledWith({
        where: { id: 'tax-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { isActive: true } as never,
        { name: 'asc' } as never,
        0,
        20,
      );

      expect(prisma.taxRate.findMany).toHaveBeenCalledWith({
        where: { isActive: true, tenantId: TENANT_ID, deletedAt: null },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
    });
  });
});
