import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { AuditRepository } from './repositories/audit.repository';
import { NotificationChannel, NotificationStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createNotificationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'notif-1',
    tenantId: TENANT_ID,
    userId: 'user-1',
    type: 'order.shipped',
    channel: NotificationChannel.IN_APP,
    title: 'Your order shipped',
    body: null,
    relatedResourceType: null,
    relatedResourceId: null,
    readAt: null,
    dismissedAt: null,
    status: NotificationStatus.PENDING,
    sentAt: null,
    failedAt: null,
    retryCount: 0,
    lastError: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeNotificationRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: jest.fn(async () => createNotificationRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createNotificationRow()),
    update: jest.fn(async () => createNotificationRow()),
    findActiveTemplateByKey: jest.fn(async () => null),
    ...overrides,
  } as unknown as NotificationRepository;
}

function createFakeAuditRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    recordEvent: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as AuditRepository;
}

describe('NotificationService', () => {
  function createService(
    overrides: {
      notificationRepository?: NotificationRepository;
      auditRepository?: AuditRepository;
    } = {},
  ) {
    return new NotificationService(
      overrides.notificationRepository ?? createFakeNotificationRepository(),
      overrides.auditRepository ?? createFakeAuditRepository(),
    );
  }

  describe('create()', () => {
    it('creates a PENDING notification from explicit title/body', async () => {
      const notificationRepository = createFakeNotificationRepository();
      const service = createService({ notificationRepository });

      await service.create(
        { userId: 'user-1', type: 'order.shipped', title: 'Shipped' },
        TENANT_ID,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          userId: 'user-1',
          type: 'order.shipped',
          channel: NotificationChannel.IN_APP,
          title: 'Shipped',
          status: NotificationStatus.PENDING,
        }),
      });
    });

    it('resolves title/body from an active template when templateKey is given', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findActiveTemplateByKey: jest.fn(async () => ({
          subject: 'Order Shipped',
          body: 'Your order is on its way',
        })),
      });
      const service = createService({ notificationRepository });

      await service.create(
        { userId: 'user-1', type: 'order.shipped', templateKey: 'order.shipped' },
        TENANT_ID,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Order Shipped', body: 'Your order is on its way' }),
      });
    });

    it('rejects when neither templateKey nor title is given', async () => {
      const service = createService();

      await expect(
        service.create({ userId: 'user-1', type: 'order.shipped' }, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unresolvable templateKey', async () => {
      const service = createService();

      await expect(
        service.create(
          { userId: 'user-1', type: 'order.shipped', templateKey: 'missing' },
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('queue()', () => {
    it('moves a PENDING notification to QUEUED', async () => {
      const notificationRepository = createFakeNotificationRepository();
      const service = createService({ notificationRepository });

      await service.queue('notif-1', TENANT_ID);

      expect(notificationRepository.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { status: NotificationStatus.QUEUED },
      });
    });

    it('rejects queueing a non-PENDING notification', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () => createNotificationRow({ status: NotificationStatus.SENT })),
      });
      const service = createService({ notificationRepository });

      await expect(service.queue('notif-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('markSent()', () => {
    it('moves a QUEUED notification to SENT and stamps sentAt', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () => createNotificationRow({ status: NotificationStatus.QUEUED })),
      });
      const service = createService({ notificationRepository });

      await service.markSent('notif-1', TENANT_ID);

      expect(notificationRepository.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { status: NotificationStatus.SENT, sentAt: expect.any(Date) },
      });
    });

    it('rejects marking a non-QUEUED notification as sent', async () => {
      const service = createService();

      await expect(service.markSent('notif-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('markFailed()', () => {
    it('moves a notification to FAILED and stamps failedAt/lastError', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () => createNotificationRow({ status: NotificationStatus.QUEUED })),
      });
      const service = createService({ notificationRepository });

      await service.markFailed('notif-1', TENANT_ID, 'delivery timeout');

      expect(notificationRepository.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: expect.any(Date),
          lastError: 'delivery timeout',
        },
      });
    });

    it('rejects marking an already-SENT notification as failed', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () => createNotificationRow({ status: NotificationStatus.SENT })),
      });
      const service = createService({ notificationRepository });

      await expect(service.markFailed('notif-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retry()', () => {
    it('resets a FAILED notification to PENDING, increments retryCount, and records an AuditLog entry', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () =>
          createNotificationRow({
            status: NotificationStatus.FAILED,
            retryCount: 1,
            lastError: 'timeout',
          }),
        ),
      });
      const auditRepository = createFakeAuditRepository();
      const service = createService({ notificationRepository, auditRepository });

      await service.retry('notif-1', TENANT_ID, 'manual retry');

      expect(notificationRepository.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: NotificationStatus.PENDING,
          retryCount: { increment: 1 },
          failedAt: null,
          lastError: null,
        },
      });
      expect(auditRepository.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'notification.retry',
          resourceType: 'notification',
          resourceId: 'notif-1',
          after: expect.objectContaining({ note: 'manual retry' }),
        }),
      );
    });

    it('rejects retrying a non-retryable (e.g. PENDING) notification', async () => {
      const service = createService();

      await expect(service.retry('notif-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the notification does not exist', async () => {
      const notificationRepository = createFakeNotificationRepository({
        findById: jest.fn(async () => null),
      });
      const service = createService({ notificationRepository });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('delegates to findManyPaginated() with defaulted pagination/sorting', async () => {
      const notificationRepository = createFakeNotificationRepository();
      const service = createService({ notificationRepository });

      await service.list({} as never, TENANT_ID);

      expect(notificationRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {},
        { createdAt: 'desc' },
        0,
        20,
      );
    });
  });
});
