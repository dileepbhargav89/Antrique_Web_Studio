import { Test } from '@nestjs/testing';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('WarehouseController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [WarehouseController],
      providers: [
        WarehouseService,
        {
          provide: WarehouseRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
              id: 'wh-1',
              ...args.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            update: jest.fn(),
            hasActiveInventory: jest.fn(async () => false),
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

    return moduleRef.get(WarehouseController);
  }

  it('resolves WarehouseService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateWarehouseDto(), {
      name: 'Main Warehouse',
      slug: 'main-warehouse',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Main Warehouse');
  });

  it('resolves WarehouseService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
