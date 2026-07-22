import { NotificationRepository } from './notification.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const notification = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const notificationTemplate = { findFirst: jest.fn(async () => null) };
  const fakePrisma: Record<string, unknown> = { notification, notificationTemplate };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new NotificationRepository(prisma);
}

describe('NotificationRepository', () => {
  describe('findById()', () => {
    it('queries findFirst() scoped to tenantId only — no deletedAt filter (Notification has no soft delete)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findById('notif-1', TENANT_ID);

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', tenantId: TENANT_ID },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId into the where clause and runs count()/findMany() in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'FAILED' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { status: 'FAILED', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { status: 'FAILED', tenantId: TENANT_ID },
      });
    });
  });

  describe('findActiveTemplateByKey()', () => {
    it('reaches prisma.notificationTemplate directly, scoped to key/channel/tenant/active/non-deleted', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveTemplateByKey('order.shipped', 'EMAIL' as never, TENANT_ID);

      expect(prisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          key: 'order.shipped',
          channel: 'EMAIL',
          tenantId: TENANT_ID,
          deletedAt: null,
          isActive: true,
        },
      });
    });
  });
});
