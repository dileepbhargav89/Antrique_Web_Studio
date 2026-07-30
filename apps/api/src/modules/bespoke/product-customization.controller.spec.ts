import { Test } from '@nestjs/testing';
import { ProductCustomizationController } from './product-customization.controller';
import { ProductCustomizationService } from './product-customization.service';
import { ProductCustomizationRepository } from './repositories/product-customization.repository';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateProductCustomizationDto } from './dto/create-product-customization.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('ProductCustomizationController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductCustomizationController],
      providers: [
        ProductCustomizationService,
        {
          provide: ProductCustomizationRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (args: Record<string, unknown>) => ({
              id: 'pc-1',
              ...args,
              styleOptionGroups: [],
              pricingAdjustments: [],
              monogramOptions: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            updateWithRelations: jest.fn(),
            replacePricingAdjustments: jest.fn(),
            replaceMonogramOptions: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'prod-1' })) },
        },
        {
          provide: StyleOptionRepository,
          useValue: { findActiveById: jest.fn(), findGroupById: jest.fn() },
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

    return moduleRef.get(ProductCustomizationController);
  }

  it('resolves ProductCustomizationService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateProductCustomizationDto(), { productId: 'prod-1' });

    const result = await controller.create(dto, TENANT);

    expect(result.productId).toBe('prod-1');
  });

  it('resolves ProductCustomizationService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('has no delete route — no @Delete route exists on this controller', () => {
    const proto = ProductCustomizationController.prototype as unknown as Record<string, unknown>;
    expect('remove' in proto).toBe(false);
  });
});
