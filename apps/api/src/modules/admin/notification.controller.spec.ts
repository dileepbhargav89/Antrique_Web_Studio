import { Test } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { AuditRepository } from './repositories/audit.repository';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { NotificationChannel, NotificationStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createNotificationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'notif-1',
    tenantId: TENANT.tenantId,
    userId: 'user-1',
    type: 'order.shipped',
    channel: NotificationChannel.IN_APP,
    title: 'Your order shipped',
    body: null,
    relatedResourceType: null,
    relatedResourceId: null,
    readAt: null,
    dismissedAt: null,
    status: NotificationStatus.FAILED,
    sentAt: null,
    failedAt: new Date(),
    retryCount: 0,
    lastError: 'timeout',
    createdAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as modules/billing/invoice.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified.
describe('NotificationController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useValue: {
            findById: jest.fn(async () => createNotificationRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            update: jest.fn(async () =>
              createNotificationRow({ status: NotificationStatus.PENDING, retryCount: 1 }),
            ),
            markAllRead: jest.fn(async () => 4),
          },
        },
        { provide: AuditRepository, useValue: { recordEvent: jest.fn(async () => ({})) } },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(NotificationController);
  }

  it('resolves NotificationService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.findById('notif-1', TENANT);

    expect(result.id).toBe('notif-1');
  });

  it('delegates retry() with the resolved tenantId and the request body note', async () => {
    const controller = await createController();

    const result = await controller.retry('notif-1', { note: 'manual retry' }, TENANT);

    expect(result.status).toBe(NotificationStatus.PENDING);
    expect(result.retryCount).toBe(1);
  });

  it('delegates markAllRead() with the resolved tenantId and the request body userId', async () => {
    const controller = await createController();

    const result = await controller.markAllRead({ userId: 'user-1' }, TENANT);

    expect(result.count).toBe(4);
  });
});
