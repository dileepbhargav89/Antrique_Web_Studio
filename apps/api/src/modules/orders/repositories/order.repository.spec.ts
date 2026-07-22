import { OrderRepository } from './order.repository';
import { PrismaService } from '../../../database/prisma.service';
import { OrderStatus } from '../../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const order = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const orderStatusHistory = {
    create: jest.fn(async () => ({}) as unknown),
  };
  const fakePrisma: Record<string, unknown> = { order, orderStatusHistory };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new OrderRepository(prisma);
}

describe('OrderRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId with the full nested include', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('order-1', TENANT_ID);

      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-1', tenantId: TENANT_ID, deletedAt: null },
        include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('does NOT include the deep nested relations on list rows (lighter summary)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(TENANT_ID, {}, { createdAt: 'desc' } as never, 0, 20);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ include: expect.anything() }),
      );
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
    it('creates the order with the given tx client, including the full nested shape', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const fakeTx = { order: { create: jest.fn(async () => ({ id: 'order-1' })) } } as never;

      await repository.createInTx(fakeTx, { tenantId: TENANT_ID, customerId: 'cust-1' } as never);

      expect((fakeTx as { order: { create: jest.Mock } }).order.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, customerId: 'cust-1' },
        include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
      });
    });
  });

  describe('addStatusHistoryInTx()', () => {
    it('creates an OrderStatusHistory row via the given tx client', async () => {
      const fakeTx = { orderStatusHistory: { create: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.addStatusHistoryInTx(
        fakeTx,
        TENANT_ID,
        'order-1',
        OrderStatus.PENDING,
        OrderStatus.DRAFT,
        'note',
      );

      expect(
        (fakeTx as { orderStatusHistory: { create: jest.Mock } }).orderStatusHistory.create,
      ).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          orderId: 'order-1',
          status: OrderStatus.PENDING,
          previousStatus: OrderStatus.DRAFT,
          note: 'note',
        },
      });
    });
  });

  describe('updateStatusInTx()', () => {
    it('updates the order status via the given tx client', async () => {
      const fakeTx = { order: { update: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.updateStatusInTx(fakeTx, 'order-1', OrderStatus.CANCELLED);

      expect((fakeTx as { order: { update: jest.Mock } }).order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  });
});
