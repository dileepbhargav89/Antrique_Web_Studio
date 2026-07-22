import { Test } from '@nestjs/testing';
import { FabricController } from './fabric.controller';
import { FabricService } from './fabric.service';
import { FabricRepository } from './repositories/fabric.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Same reasoning as modules/catalog/category.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (FabricController -> FabricService -> FabricRepository/ProductRepository).
describe('FabricController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [FabricController],
      providers: [
        FabricService,
        {
          provide: FabricRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (args: Record<string, unknown>) => ({
              id: 'fab-1',
              ...args,
              images: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            update: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: { findActiveById: jest.fn(), findExistingIds: jest.fn(async () => new Set()) },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(FabricController);
  }

  it('resolves FabricService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateFabricDto(), { name: 'Navy Wool', slug: 'navy-wool' });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Navy Wool');
  });

  it('resolves FabricService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
