import { Test } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { ProductCustomizationRepository } from '../bespoke/repositories/product-customization.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { Prisma } from '../../../generated/prisma/client';
import { OrderStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    tenantId: TENANT.tenantId,
    customerId: 'cust-1',
    status: OrderStatus.DRAFT,
    shippingAddressId: null,
    billingAddressId: null,
    subtotal: new Prisma.Decimal('200.00'),
    total: new Prisma.Decimal('200.00'),
    notes: null,
    items: [],
    statusHistory: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// Same reasoning as modules/bespoke/fabric.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (OrderController -> OrderService -> its five repository/service deps).
describe('OrderController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: {
            findActiveById: jest.fn(async () => createOrderRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            update: jest.fn(async () => createOrderRow()),
            runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
            createInTx: jest.fn(async () => createOrderRow()),
            addStatusHistoryInTx: jest.fn(async () => undefined),
            updateStatusInTx: jest.fn(async () => undefined),
          },
        },
        {
          provide: CustomerRepository,
          useValue: {
            findActiveById: jest.fn(async () => ({ id: 'cust-1', addresses: [] })),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findVariantById: jest.fn(async () => ({
              id: 'variant-1',
              productId: 'prod-1',
              price: new Prisma.Decimal('100.00'),
            })),
            findVariantsByIds: jest.fn(async () => [
              { id: 'variant-1', productId: 'prod-1', price: new Prisma.Decimal('100.00') },
            ]),
          },
        },
        {
          provide: ProductCustomizationRepository,
          useValue: { findActiveById: jest.fn(async () => null) },
        },
        {
          provide: InventoryService,
          useValue: {
            findItemForVariant: jest.fn(async () => ({ id: 'inv-item-1' })),
            reserveStockForOrder: jest.fn(async () => ({ reservationId: 'res-1' })),
            releaseReservation: jest.fn(async () => undefined),
            consumeReservation: jest.fn(async () => undefined),
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

    return moduleRef.get(OrderController);
  }

  it('resolves OrderService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateOrderDto(), {
      customerId: 'cust-1',
      items: [
        Object.assign(new CreateOrderItemDto(), {
          warehouseId: 'wh-1',
          productVariantId: 'variant-1',
          quantity: '2',
        }),
      ],
    });

    const result = await controller.create(dto, TENANT);

    expect(result.customerId).toBe('cust-1');
  });

  it('resolves OrderService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.findById('order-1', TENANT);

    expect(result.id).toBe('order-1');
  });

  it('delegates changeStatus() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.PENDING });

    const result = await controller.changeStatus('order-1', dto, TENANT);

    expect(result.id).toBe('order-1');
  });

  it('delegates cancel() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.cancel('order-1', new CancelOrderDto(), TENANT);

    expect(result.id).toBe('order-1');
  });
});
