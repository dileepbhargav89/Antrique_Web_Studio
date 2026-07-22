import { CustomerActivityRepository } from './customer-activity.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const customerActivity = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { customerActivity };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CustomerActivityRepository(prisma);
}

describe('CustomerActivityRepository', () => {
  describe('createInTx()', () => {
    it('creates the activity via the given tx client', async () => {
      const fakeTx = { customerActivity: { create: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.createInTx(fakeTx, {
        tenantId: TENANT_ID,
        type: 'LEAD_CREATED',
        summary: 'Lead created',
        relatedLeadId: 'lead-1',
      } as never);

      expect(
        (fakeTx as { customerActivity: { create: jest.Mock } }).customerActivity.create,
      ).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          type: 'LEAD_CREATED',
          summary: 'Lead created',
          relatedLeadId: 'lead-1',
        },
      });
    });
  });

  describe('findTimelineForCustomer()', () => {
    it('queries findMany() scoped to the customer, ascending (oldest first)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findTimelineForCustomer('cust-1', TENANT_ID);

      expect(prisma.customerActivity.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', tenantId: TENANT_ID },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId into the where clause itself (no deletedAt — append-only, no soft-delete)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { type: 'LEAD_CREATED' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.customerActivity.findMany).toHaveBeenCalledWith({
        where: { type: 'LEAD_CREATED', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });
});
