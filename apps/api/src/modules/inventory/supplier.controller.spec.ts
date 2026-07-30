import { Test } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { SupplierRepository } from './repositories/supplier.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('SupplierController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [
        SupplierService,
        {
          provide: SupplierRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (args: Record<string, unknown>) => ({
              id: 'sup-1',
              ...args,
              supplierProducts: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            updateWithRelations: jest.fn(),
            replaceSupplierProducts: jest.fn(),
            productVariantExistsForTenant: jest.fn(async () => true),
            fabricExistsForTenant: jest.fn(async () => true),
          },
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

    return moduleRef.get(SupplierController);
  }

  it('resolves SupplierService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateSupplierDto(), {
      name: 'Millbrook Textiles',
      slug: 'millbrook-textiles',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Millbrook Textiles');
  });

  it('resolves SupplierService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
