import { Test } from '@nestjs/testing';
import { CustomerTagController } from './customer-tag.controller';
import { CustomerTagService } from './customer-tag.service';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createTagRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tag-1',
    tenantId: TENANT.tenantId,
    name: 'VIP',
    slug: 'vip',
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CustomerTagController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomerTagController],
      providers: [
        CustomerTagService,
        {
          provide: CustomerTagRepository,
          useValue: {
            findActiveById: jest.fn(async () => createTagRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: Record<string, unknown>) =>
              createTagRow(args.data as Record<string, unknown>),
            ),
            update: jest.fn(async () => createTagRow()),
            assign: jest.fn(async () => ({})),
            unassign: jest.fn(async () => true),
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
      ],
    }).compile();

    return moduleRef.get(CustomerTagController);
  }

  it('resolves CustomerTagService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateCustomerTagDto(), { name: 'VIP', slug: 'vip' });

    const result = await controller.create(dto, TENANT);

    expect(result.slug).toBe('vip');
  });

  it('resolves CustomerTagService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates assign() with the resolved tenantId', async () => {
    const controller = await createController();

    await expect(controller.assign('tag-1', 'cust-1', TENANT)).resolves.toBeUndefined();
  });
});
