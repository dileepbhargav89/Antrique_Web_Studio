import { Test } from '@nestjs/testing';
import { TaxRateController } from './tax-rate.controller';
import { TaxService } from './tax.service';
import { TaxRepository } from './repositories/tax.repository';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createTaxRateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tax-1',
    tenantId: TENANT.tenantId,
    name: 'GST 18%',
    rate: new Prisma.Decimal('18.00'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('TaxRateController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [TaxRateController],
      providers: [
        TaxService,
        {
          provide: TaxRepository,
          useValue: {
            findActiveById: jest.fn(async () => createTaxRateRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: Record<string, unknown>) =>
              createTaxRateRow(args.data as Record<string, unknown>),
            ),
            update: jest.fn(async () => createTaxRateRow()),
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

    return moduleRef.get(TaxRateController);
  }

  it('resolves TaxService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateTaxRateDto(), { name: 'GST 18%', rate: '18.00' });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('GST 18%');
  });

  it('resolves TaxService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates remove() with the resolved tenantId', async () => {
    const controller = await createController();

    await expect(controller.remove('tax-1', TENANT)).resolves.toBeUndefined();
  });
});
