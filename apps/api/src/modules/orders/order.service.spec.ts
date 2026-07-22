import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '../../../generated/prisma/client';
import { OrderStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    tenantId: TENANT_ID,
    customerId: 'cust-1',
    status: OrderStatus.DRAFT,
    shippingAddressId: null,
    billingAddressId: null,
    subtotal: new Prisma.Decimal(0),
    total: new Prisma.Decimal(0),
    notes: null,
    items: [],
    statusHistory: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createOrderItemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    productVariantId: 'variant-1',
    productCustomizationId: null,
    inventoryReservationId: null,
    quantity: new Prisma.Decimal('2'),
    unitPrice: new Prisma.Decimal('100.00'),
    pricingAdjustmentsTotal: new Prisma.Decimal('0'),
    lineTotal: new Prisma.Decimal('200.00'),
    selectedOptions: null,
    ...overrides,
  };
}

function createCustomerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cust-1',
    tenantId: TENANT_ID,
    email: 'jordan@example.com',
    addresses: [{ id: 'addr-1' }],
    ...overrides,
  };
}

function createVariantRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'variant-1',
    productId: 'prod-1',
    price: new Prisma.Decimal('100.00'),
    ...overrides,
  };
}

function createFakeOrderRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createOrderRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    update: jest.fn(async () => createOrderRow()),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    createInTx: jest.fn(async () => createOrderRow()),
    addStatusHistoryInTx: jest.fn(async () => undefined),
    updateStatusInTx: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as OrderRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createCustomerRow()),
    ...overrides,
  } as unknown as CustomerRepository;
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findVariantById: jest.fn(async () => createVariantRow()),
    findVariantsByIds: jest.fn(async () => [createVariantRow()]),
    ...overrides,
  } as unknown as ProductRepository;
}

function createFakeCustomizationRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    ...overrides,
  } as unknown as ProductCustomizationRepository;
}

function createFakeInventoryService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findItemForVariant: jest.fn(async () => ({ id: 'inv-item-1' })),
    reserveStockForOrder: jest.fn(async () => ({ reservationId: 'res-1' })),
    releaseReservation: jest.fn(async () => undefined),
    consumeReservation: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as InventoryService;
}

function orderItemDto(overrides: Partial<CreateOrderItemDto> = {}): CreateOrderItemDto {
  return Object.assign(new CreateOrderItemDto(), {
    warehouseId: 'wh-1',
    productVariantId: 'variant-1',
    quantity: '2',
    ...overrides,
  });
}

function createOrderDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
  return Object.assign(new CreateOrderDto(), {
    customerId: 'cust-1',
    items: [orderItemDto()],
    ...overrides,
  });
}

describe('OrderService', () => {
  function createService(
    overrides: {
      orderRepository?: OrderRepository;
      customerRepository?: CustomerRepository;
      productRepository?: ProductRepository;
      productCustomizationRepository?: ProductCustomizationRepository;
      inventoryService?: InventoryService;
    } = {},
  ) {
    return new OrderService(
      overrides.orderRepository ?? createFakeOrderRepository(),
      overrides.customerRepository ?? createFakeCustomerRepository(),
      overrides.productRepository ?? createFakeProductRepository(),
      overrides.productCustomizationRepository ?? createFakeCustomizationRepository(),
      overrides.inventoryService ?? createFakeInventoryService(),
    );
  }

  describe('create()', () => {
    it('validates the customer, reserves inventory, and creates the order within one transaction', async () => {
      const orderRepository = createFakeOrderRepository();
      const inventoryService = createFakeInventoryService();
      const service = createService({ orderRepository, inventoryService });

      await service.create(createOrderDto(), TENANT_ID);

      expect(orderRepository.runInTransaction).toHaveBeenCalledTimes(1);
      expect(inventoryService.reserveStockForOrder).toHaveBeenCalledWith(
        'inv-item-1',
        '2',
        TENANT_ID,
        expect.anything(),
        expect.any(String),
      );
      expect(orderRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: 'cust-1',
          status: OrderStatus.DRAFT,
          statusHistory: {
            create: [{ tenantId: TENANT_ID, status: OrderStatus.DRAFT, previousStatus: null }],
          },
        }),
      );
    });

    it('rejects a customerId that does not resolve within the caller tenant ("Validate customer")', async () => {
      const customerRepository = createFakeCustomerRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ customerRepository });

      await expect(service.create(createOrderDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a shippingAddressId that does not belong to the resolved customer', async () => {
      const service = createService();

      await expect(
        service.create(createOrderDto({ shippingAddressId: 'someone-elses-address' }), TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a productVariantId that does not resolve within the caller tenant ("Validate product variants")', async () => {
      const productRepository = createFakeProductRepository({
        findVariantsByIds: jest.fn(async () => []),
      });
      const service = createService({ productRepository });

      await expect(service.create(createOrderDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a non-positive item quantity', async () => {
      const service = createService();

      await expect(
        service.create(createOrderDto({ items: [orderItemDto({ quantity: '0' })] }), TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects selectedOptions supplied without a productCustomizationId', async () => {
      const service = createService();

      await expect(
        service.create(
          createOrderDto({
            items: [orderItemDto({ selectedOptions: { styleOptionIds: ['so-1'] } })],
          }),
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a productCustomizationId that does not exist ("Validate bespoke customization")', async () => {
      const productCustomizationRepository = createFakeCustomizationRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ productCustomizationRepository });

      await expect(
        service.create(
          createOrderDto({ items: [orderItemDto({ productCustomizationId: 'pc-1' })] }),
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a productCustomizationId belonging to a different product than the variant', async () => {
      const productCustomizationRepository = createFakeCustomizationRepository({
        findActiveById: jest.fn(async () => ({
          productId: 'a-different-product',
          styleOptionGroups: [],
          pricingAdjustments: [],
          monogramOptions: [],
        })),
      });
      const service = createService({ productCustomizationRepository });

      await expect(
        service.create(
          createOrderDto({ items: [orderItemDto({ productCustomizationId: 'pc-1' })] }),
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('computes and applies pricing adjustments for selected style options ("Validate pricing adjustments")', async () => {
      const productCustomizationRepository = createFakeCustomizationRepository({
        findActiveById: jest.fn(async () => ({
          productId: 'prod-1',
          styleOptionGroups: [{ styleOptions: [{ id: 'so-1' }] }],
          pricingAdjustments: [
            { styleOptionId: 'so-1', amount: new Prisma.Decimal('15.00'), isActive: true },
          ],
          monogramOptions: [],
        })),
      });
      const orderRepository = createFakeOrderRepository();
      const service = createService({ productCustomizationRepository, orderRepository });

      await service.create(
        createOrderDto({
          items: [
            orderItemDto({
              productCustomizationId: 'pc-1',
              selectedOptions: { styleOptionIds: ['so-1'] },
            }),
          ],
        }),
        TENANT_ID,
      );

      expect(orderRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          subtotal: expect.any(Prisma.Decimal),
          total: expect.any(Prisma.Decimal),
        }),
      );
      const call = (orderRepository.createInTx as jest.Mock).mock.calls[0][1];
      // unitPrice 100 * qty 2 + adjustment 15 = 215
      expect(call.subtotal.toString()).toBe('215');
    });

    it('rejects a selected style option that does not belong to the customization', async () => {
      const productCustomizationRepository = createFakeCustomizationRepository({
        findActiveById: jest.fn(async () => ({
          productId: 'prod-1',
          styleOptionGroups: [{ styleOptions: [{ id: 'so-1' }] }],
          pricingAdjustments: [],
          monogramOptions: [],
        })),
      });
      const service = createService({ productCustomizationRepository });

      await expect(
        service.create(
          createOrderDto({
            items: [
              orderItemDto({
                productCustomizationId: 'pc-1',
                selectedOptions: { styleOptionIds: ['not-a-real-option'] },
              }),
            ],
          }),
          TENANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when no inventory is tracked for the variant in the given warehouse', async () => {
      const inventoryService = createFakeInventoryService({
        findItemForVariant: jest.fn(async () => null),
      });
      const service = createService({ inventoryService });

      await expect(service.create(createOrderDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ orderRepository });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ orderRepository });

      await expect(service.update('missing', new UpdateOrderDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a shippingAddressId that does not belong to the order customer', async () => {
      const service = createService();
      const dto = Object.assign(new UpdateOrderDto(), { shippingAddressId: 'not-owned' });

      await expect(service.update('order-1', dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus()', () => {
    it('advances to the single valid forward transition and records status history', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () =>
          createOrderRow({ status: OrderStatus.DRAFT, items: [] }),
        ),
      });
      const service = createService({ orderRepository });
      const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.PENDING });

      await service.changeStatus('order-1', dto, TENANT_ID);

      expect(orderRepository.updateStatusInTx).toHaveBeenCalledWith(
        expect.anything(),
        'order-1',
        OrderStatus.PENDING,
      );
      expect(orderRepository.addStatusHistoryInTx).toHaveBeenCalledWith(
        expect.anything(),
        TENANT_ID,
        'order-1',
        OrderStatus.PENDING,
        OrderStatus.DRAFT,
        undefined,
      );
    });

    it('rejects a skip-ahead transition (e.g. DRAFT -> CONFIRMED)', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => createOrderRow({ status: OrderStatus.DRAFT })),
      });
      const service = createService({ orderRepository });
      const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.CONFIRMED });

      await expect(service.changeStatus('order-1', dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects any transition attempted from a terminal status', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => createOrderRow({ status: OrderStatus.COMPLETED })),
      });
      const service = createService({ orderRepository });
      const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.COMPLETED });

      await expect(service.changeStatus('order-1', dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('consumes inventory reservations when the order reaches COMPLETED', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () =>
          createOrderRow({
            status: OrderStatus.PROCESSING,
            items: [
              createOrderItemRow({ inventoryReservationId: 'res-1' }),
              createOrderItemRow({ inventoryReservationId: null }),
            ],
          }),
        ),
      });
      const inventoryService = createFakeInventoryService();
      const service = createService({ orderRepository, inventoryService });
      const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.COMPLETED });

      await service.changeStatus('order-1', dto, TENANT_ID);

      expect(inventoryService.consumeReservation).toHaveBeenCalledTimes(1);
      expect(inventoryService.consumeReservation).toHaveBeenCalledWith(
        'res-1',
        TENANT_ID,
        expect.anything(),
      );
    });

    it('throws NotFoundException when the order does not exist', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ orderRepository });
      const dto = Object.assign(new ChangeOrderStatusDto(), { status: OrderStatus.PENDING });

      await expect(service.changeStatus('missing', dto, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel()', () => {
    it('releases every item reservation and records the CANCELLED transition', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () =>
          createOrderRow({
            status: OrderStatus.CONFIRMED,
            items: [
              createOrderItemRow({ inventoryReservationId: 'res-1' }),
              createOrderItemRow({ inventoryReservationId: 'res-2' }),
            ],
          }),
        ),
      });
      const inventoryService = createFakeInventoryService();
      const service = createService({ orderRepository, inventoryService });

      await service.cancel('order-1', new CancelOrderDto(), TENANT_ID);

      expect(inventoryService.releaseReservation).toHaveBeenCalledTimes(2);
      expect(orderRepository.updateStatusInTx).toHaveBeenCalledWith(
        expect.anything(),
        'order-1',
        OrderStatus.CANCELLED,
      );
      expect(orderRepository.addStatusHistoryInTx).toHaveBeenCalledWith(
        expect.anything(),
        TENANT_ID,
        'order-1',
        OrderStatus.CANCELLED,
        OrderStatus.CONFIRMED,
        undefined,
      );
    });

    it('rejects cancelling an order already in a terminal status', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => createOrderRow({ status: OrderStatus.COMPLETED })),
      });
      const service = createService({ orderRepository });

      await expect(service.cancel('order-1', new CancelOrderDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the order does not exist', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ orderRepository });

      await expect(service.cancel('missing', new CancelOrderDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
