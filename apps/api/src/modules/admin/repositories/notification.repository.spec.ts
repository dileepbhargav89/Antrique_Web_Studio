import { NotificationRepository } from './notification.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const notification = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    updateMany: jest.fn(async () => ({ count: 0 })),
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

  describe('findManyByCursor()', () => {
    it('queries id DESC with no id filter when cursor is absent (first page)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyByCursor(TENANT_ID, { status: 'FAILED' } as never, undefined, 20);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { status: 'FAILED', tenantId: TENANT_ID },
        orderBy: { id: 'desc' },
        take: 21,
      });
    });

    it('adds an id < cursor filter when a cursor is given', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyByCursor(TENANT_ID, {} as never, 'notif-20', 20);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, id: { lt: 'notif-20' } },
        orderBy: { id: 'desc' },
        take: 21,
      });
    });

    it('returns nextCursor as the last item id and trims the extra lookahead row when more pages exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({ id: `notif-${20 - i}` }));
      const prisma = createFakePrisma();
      (prisma.notification.findMany as jest.Mock).mockResolvedValueOnce(rows);
      const repository = createRepository(prisma);

      const result = await repository.findManyByCursor(TENANT_ID, {} as never, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('notif-1');
    });

    it('returns nextCursor null when fewer rows than the page size come back (last page)', async () => {
      const rows = [{ id: 'notif-2' }, { id: 'notif-1' }];
      const prisma = createFakePrisma();
      (prisma.notification.findMany as jest.Mock).mockResolvedValueOnce(rows);
      const repository = createRepository(prisma);

      const result = await repository.findManyByCursor(TENANT_ID, {} as never, undefined, 20);

      expect(result.items).toEqual(rows);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('markAllRead()', () => {
    it('updates every unread notification tenant-wide when userId is omitted', async () => {
      const prisma = createFakePrisma();
      (prisma.notification.updateMany as jest.Mock).mockResolvedValueOnce({ count: 5 });
      const repository = createRepository(prisma);

      const count = await repository.markAllRead(TENANT_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(count).toBe(5);
    });

    it('scopes to a single userId when given', async () => {
      const prisma = createFakePrisma();
      (prisma.notification.updateMany as jest.Mock).mockResolvedValueOnce({ count: 2 });
      const repository = createRepository(prisma);

      const count = await repository.markAllRead(TENANT_ID, 'user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(count).toBe(2);
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
