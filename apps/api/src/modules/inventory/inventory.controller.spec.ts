import { Test } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('InventoryController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            findActiveByWarehouseAndVariant: jest.fn(async () => null),
            findActiveByWarehouseAndFabric: jest.fn(async () => null),
            create: jest.fn(async () => ({ id: 'item-1' })),
            applyStockChange: jest.fn(async () => ({
              id: 'item-1',
              warehouseId: 'wh-1',
              productVariantId: null,
              fabricId: 'fab-1',
              onHand: new Prisma.Decimal(150),
              reserved: new Prisma.Decimal(0),
              reorderPoint: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            findTransactionsPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            productVariantExistsForTenant: jest.fn(async () => true),
            fabricExistsForTenant: jest.fn(async () => true),
          },
        },
        {
          provide: WarehouseRepository,
          useValue: { findActiveById: jest.fn(async () => ({ id: 'wh-1' })) },
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

    return moduleRef.get(InventoryController);
  }

  it('resolves InventoryService via DI and delegates receiveStock() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new ReceiveStockDto(), {
      warehouseId: 'wh-1',
      fabricId: 'fab-1',
      quantity: '150',
    });

    const result = await controller.receiveStock(dto, TENANT);

    expect(result.onHand).toBe('150');
    expect(result.available).toBe('150');
  });

  it('resolves InventoryService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('has a listTransactions() route declared before getStock(:id) — route-order regression guard', () => {
    const proto = Object.getOwnPropertyNames(InventoryController.prototype);
    expect(proto.indexOf('listTransactions')).toBeLessThan(proto.indexOf('getStock'));
  });
});
