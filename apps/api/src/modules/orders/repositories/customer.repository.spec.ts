import { CustomerRepository } from './customer.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const customer = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const customerAddress = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  const user = { findFirst: jest.fn(async () => null) };
  return {
    customer,
    customerAddress,
    user,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CustomerRepository(prisma);
}

describe('CustomerRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows, with addresses included', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('cust-1', TENANT_ID);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', tenantId: TENANT_ID, deletedAt: null },
        include: { addresses: true },
      });
    });
  });

  describe('replaceAddresses()', () => {
    it('deletes existing addresses then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.replaceAddresses(TENANT_ID, 'cust-1', [
        { line1: '1 Main St', city: 'Newark', country: 'USA' },
      ]);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.customerAddress.deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', tenantId: TENANT_ID },
      });
      expect(prisma.customerAddress.createMany).toHaveBeenCalledWith({
        data: [
          {
            line1: '1 Main St',
            city: 'Newark',
            country: 'USA',
            tenantId: TENANT_ID,
            customerId: 'cust-1',
          },
        ],
      });
    });
  });

  describe('userBelongsToTenant()', () => {
    it('returns true when a matching, non-deleted user is found', async () => {
      const prisma = createFakePrisma();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });
      const repository = createRepository(prisma);

      expect(await repository.userBelongsToTenant('user-1', TENANT_ID)).toBe(true);
    });

    it('returns false when no matching user is found', async () => {
      const repository = createRepository();

      expect(await repository.userBelongsToTenant('missing', TENANT_ID)).toBe(false);
    });
  });
});
