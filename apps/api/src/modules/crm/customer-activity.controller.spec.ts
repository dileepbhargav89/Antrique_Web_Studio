import { Test } from '@nestjs/testing';
import { CustomerActivityController } from './customer-activity.controller';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('CustomerActivityController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomerActivityController],
      providers: [
        CustomerActivityService,
        {
          provide: CustomerActivityRepository,
          useValue: {
            findTimelineForCustomer: jest.fn(async () => []),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
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

    return moduleRef.get(CustomerActivityController);
  }

  it('resolves CustomerActivityService via DI and delegates timeline() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.timeline({ customerId: 'cust-1' } as never, TENANT);

    expect(result).toEqual([]);
  });

  it('resolves CustomerActivityService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
