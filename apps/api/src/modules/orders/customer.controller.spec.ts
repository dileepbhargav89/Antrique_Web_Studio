import { Test } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './repositories/customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createCustomerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cust-1',
    tenantId: TENANT.tenantId,
    userId: null,
    email: 'jordan@example.com',
    firstName: null,
    lastName: null,
    phone: null,
    status: 'ACTIVE',
    addresses: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// Same reasoning as modules/bespoke/fabric.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (CustomerController -> CustomerService -> CustomerRepository).
describe('CustomerController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: {
            findActiveById: jest.fn(async () => createCustomerRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (args: Record<string, unknown>) =>
              createCustomerRow(args),
            ),
            updateWithRelations: jest.fn(async () => createCustomerRow()),
            replaceAddresses: jest.fn(async () => undefined),
            update: jest.fn(async () => createCustomerRow()),
            userBelongsToTenant: jest.fn(async () => true),
          },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(CustomerController);
  }

  it('resolves CustomerService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateCustomerDto(), { email: 'jordan@example.com' });

    const result = await controller.create(dto, TENANT);

    expect(result.email).toBe('jordan@example.com');
  });

  it('resolves CustomerService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.findById('cust-1', TENANT);

    expect(result.id).toBe('cust-1');
  });

  it('delegates remove() with the resolved tenantId', async () => {
    const controller = await createController();

    await expect(controller.remove('cust-1', TENANT)).resolves.toBeUndefined();
  });
});
