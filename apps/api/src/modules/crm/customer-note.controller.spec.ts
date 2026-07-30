import { Test } from '@nestjs/testing';
import { CustomerNoteController } from './customer-note.controller';
import { CustomerNoteService } from './customer-note.service';
import { CustomerNoteRepository } from './repositories/customer-note.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createNoteRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'note-1',
    tenantId: TENANT.tenantId,
    customerId: 'cust-1',
    authorUserId: null,
    body: 'Hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CustomerNoteController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomerNoteController],
      providers: [
        CustomerNoteService,
        {
          provide: CustomerNoteRepository,
          useValue: {
            findActiveById: jest.fn(async () => createNoteRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: Record<string, unknown>) =>
              createNoteRow(args.data as Record<string, unknown>),
            ),
            update: jest.fn(async () => createNoteRow()),
          },
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

    return moduleRef.get(CustomerNoteController);
  }

  it('resolves CustomerNoteService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateCustomerNoteDto(), { customerId: 'cust-1', body: 'Hello' });

    const result = await controller.create(dto, TENANT);

    expect(result.body).toBe('Hello');
  });

  it('resolves CustomerNoteService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates remove() with the resolved tenantId', async () => {
    const controller = await createController();

    await expect(controller.remove('note-1', TENANT)).resolves.toBeUndefined();
  });
});
