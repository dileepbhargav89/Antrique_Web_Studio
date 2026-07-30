import { Test } from '@nestjs/testing';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { FollowUpRepository } from './repositories/follow-up.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { FollowUpStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };
const FUTURE_DATE = '2099-01-01T00:00:00.000Z';

function createTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: TENANT.tenantId,
    leadId: null,
    customerId: 'cust-1',
    title: 'Call back',
    description: null,
    dueAt: new Date(FUTURE_DATE),
    status: FollowUpStatus.PENDING,
    assigneeId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('FollowUpController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [FollowUpController],
      providers: [
        FollowUpService,
        {
          provide: FollowUpRepository,
          useValue: {
            findActiveById: jest.fn(async () => createTaskRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: Record<string, unknown>) =>
              createTaskRow(args.data as Record<string, unknown>),
            ),
            update: jest.fn(async () => createTaskRow()),
            runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
            updateInTx: jest.fn(async () => createTaskRow({ status: FollowUpStatus.COMPLETED })),
          },
        },
        {
          provide: CustomerActivityRepository,
          useValue: { createInTx: jest.fn(async () => ({})) },
        },
        {
          provide: LeadRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'lead-1' })) },
        },
        {
          provide: CustomerRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'cust-1' })) },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(FollowUpController);
  }

  it('resolves FollowUpService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateFollowUpDto(), {
      customerId: 'cust-1',
      title: 'Call back',
      dueAt: FUTURE_DATE,
    });

    const result = await controller.create(dto, TENANT);

    expect(result.title).toBe('Call back');
  });

  it('resolves FollowUpService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates complete() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.complete('task-1', new CompleteFollowUpDto(), TENANT);

    expect(result.status).toBe(FollowUpStatus.COMPLETED);
  });
});
