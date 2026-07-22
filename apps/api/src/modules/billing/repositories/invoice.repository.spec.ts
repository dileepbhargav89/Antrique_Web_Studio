import { InvoiceRepository } from './invoice.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const invoice = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { invoice };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new InvoiceRepository(prisma);
}

describe('InvoiceRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId with the nested items include', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('inv-1', TENANT_ID);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', tenantId: TENANT_ID, deletedAt: null },
        include: { items: true },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'DRAFT' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { status: 'DRAFT', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('countForTenantAndYear()', () => {
    it('scopes the count to the given tenant and calendar year (UTC)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.countForTenantAndYear(TENANT_ID, 2026);

      expect(prisma.invoice.count).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          createdAt: { gte: new Date(Date.UTC(2026, 0, 1)), lt: new Date(Date.UTC(2027, 0, 1)) },
        },
      });
    });
  });

  describe('runInTransaction()', () => {
    it('delegates to prisma.$transaction() with the given callback', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const work = jest.fn(async () => 'result');

      const result = await repository.runInTransaction(work);

      expect(prisma.$transaction).toHaveBeenCalledWith(work);
      expect(result).toBe('result');
    });
  });

  describe('createInTx()', () => {
    it('creates the invoice via the given tx client, including the nested items shape', async () => {
      const fakeTx = { invoice: { create: jest.fn(async () => ({ id: 'inv-1' })) } } as never;
      const repository = createRepository();

      await repository.createInTx(fakeTx, {
        tenantId: TENANT_ID,
        invoiceNumber: 'INV-2026-00001',
      } as never);

      expect((fakeTx as { invoice: { create: jest.Mock } }).invoice.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, invoiceNumber: 'INV-2026-00001' },
        include: { items: true },
      });
    });
  });

  describe('updateInTx()', () => {
    it('updates the invoice via the given tx client', async () => {
      const fakeTx = { invoice: { update: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.updateInTx(fakeTx, 'inv-1', { status: 'PAID' } as never);

      expect((fakeTx as { invoice: { update: jest.Mock } }).invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'PAID' },
      });
    });
  });
});
