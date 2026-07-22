import { PaymentRepository } from './payment.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const payment = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const paymentAllocation = {
    create: jest.fn(async () => ({}) as unknown),
    findMany: jest.fn(async () => []),
    aggregate: jest.fn(async () => ({ _sum: { amount: null } })),
  };
  const paymentMethod = {
    findFirst: jest.fn(async () => null),
  };
  const fakePrisma: Record<string, unknown> = { payment, paymentAllocation, paymentMethod };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new PaymentRepository(prisma);
}

describe('PaymentRepository', () => {
  describe('findById()', () => {
    it('queries findFirst() scoped to tenantId (no soft-delete column — append-only)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findById('pay-1', TENANT_ID);

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: 'pay-1', tenantId: TENANT_ID },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'SUCCEEDED' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { status: 'SUCCEEDED', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('createInTx()', () => {
    it('creates the payment via the given tx client', async () => {
      const fakeTx = { payment: { create: jest.fn(async () => ({ id: 'pay-1' })) } } as never;
      const repository = createRepository();

      await repository.createInTx(fakeTx, { tenantId: TENANT_ID, amount: '100.00' } as never);

      expect((fakeTx as { payment: { create: jest.Mock } }).payment.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, amount: '100.00' },
      });
    });
  });

  describe('sumAllocationsInTx()', () => {
    it('returns zero when no allocations exist yet', async () => {
      const fakeTx = {
        paymentAllocation: { aggregate: jest.fn(async () => ({ _sum: { amount: null } })) },
      } as never;
      const repository = createRepository();

      const result = await repository.sumAllocationsInTx(fakeTx, 'pay-1', TENANT_ID);

      expect(result.toString()).toBe('0');
    });

    it('returns the real sum when allocations exist', async () => {
      const fakeTx = {
        paymentAllocation: {
          aggregate: jest.fn(async () => ({ _sum: { amount: new Prisma.Decimal('60.00') } })),
        },
      } as never;
      const repository = createRepository();

      const result = await repository.sumAllocationsInTx(fakeTx, 'pay-1', TENANT_ID);

      expect(result.toString()).toBe('60');
    });
  });

  describe('createAllocationInTx()', () => {
    it('creates the allocation via the given tx client', async () => {
      const fakeTx = { paymentAllocation: { create: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.createAllocationInTx(fakeTx, {
        tenantId: TENANT_ID,
        paymentId: 'pay-1',
        invoiceId: 'inv-1',
        amount: '60.00',
      } as never);

      expect(
        (fakeTx as { paymentAllocation: { create: jest.Mock } }).paymentAllocation.create,
      ).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, paymentId: 'pay-1', invoiceId: 'inv-1', amount: '60.00' },
      });
    });
  });

  describe('findActivePaymentMethodById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActivePaymentMethodById('pm-1', TENANT_ID);

      expect(
        (prisma as unknown as { paymentMethod: { findFirst: jest.Mock } }).paymentMethod.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: 'pm-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });
});
