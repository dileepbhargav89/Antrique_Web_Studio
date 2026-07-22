import { CustomerTagRepository } from './customer-tag.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const customerTag = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const customerTagAssignment = {
    create: jest.fn(async () => ({}) as unknown),
    deleteMany: jest.fn(async () => ({ count: 1 })),
    findMany: jest.fn(async () => []),
  };
  const fakePrisma: Record<string, unknown> = { customerTag, customerTagAssignment };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CustomerTagRepository(prisma);
}

describe('CustomerTagRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('tag-1', TENANT_ID);

      expect(prisma.customerTag.findFirst).toHaveBeenCalledWith({
        where: { id: 'tag-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('assign()', () => {
    it('creates a CustomerTagAssignment row', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.assign(TENANT_ID, 'cust-1', 'tag-1');

      expect(prisma.customerTagAssignment.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, customerId: 'cust-1', customerTagId: 'tag-1' },
      });
    });
  });

  describe('unassign()', () => {
    it('issues a real DELETE (no soft-delete column on the join table) and reports whether a row was removed', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.unassign(TENANT_ID, 'cust-1', 'tag-1');

      expect(prisma.customerTagAssignment.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, customerId: 'cust-1', customerTagId: 'tag-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when nothing was assigned to begin with', async () => {
      const prisma = createFakePrisma();
      (prisma.customerTagAssignment.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      const repository = createRepository(prisma);

      const result = await repository.unassign(TENANT_ID, 'cust-1', 'tag-1');

      expect(result).toBe(false);
    });
  });
});
