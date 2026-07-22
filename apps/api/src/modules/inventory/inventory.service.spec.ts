import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { Prisma, InventoryTransactionType } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createItemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    tenantId: TENANT_ID,
    warehouseId: 'wh-1',
    productVariantId: null,
    fabricId: 'fab-1',
    onHand: new Prisma.Decimal(10),
    reserved: new Prisma.Decimal(2),
    reorderPoint: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeInventoryRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    findActiveByWarehouseAndVariant: jest.fn(async () => null),
    findActiveByWarehouseAndFabric: jest.fn(async () => null),
    create: jest.fn(async () => createItemRow()),
    applyStockChange: jest.fn(async () => createItemRow()),
    reserveStock: jest.fn(async () => ({ item: createItemRow(), reservation: {} })),
    releaseReservation: jest.fn(async () => null),
    consumeReservation: jest.fn(async () => null),
    findTransactionsPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    productVariantExistsForTenant: jest.fn(async () => true),
    fabricExistsForTenant: jest.fn(async () => true),
    getStockValuationAggregate: jest.fn(async () => ({
      itemCount: 0,
      valuation: new Prisma.Decimal(0),
    })),
    findLowStockItems: jest.fn(async () => []),
    ...overrides,
  } as unknown as InventoryRepository;
}

function createFakeWarehouseRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'wh-1' })),
    ...overrides,
  } as unknown as WarehouseRepository;
}

describe('InventoryService', () => {
  describe('receiveStock()', () => {
    it('rejects when neither productVariantId nor fabricId is given', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );
      const dto = Object.assign(new ReceiveStockDto(), { warehouseId: 'wh-1', quantity: '10' });

      await expect(service.receiveStock(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when BOTH productVariantId and fabricId are given ("exactly one")', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        productVariantId: 'var-1',
        fabricId: 'fab-1',
        quantity: '10',
      });

      await expect(service.receiveStock(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-positive quantity', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        fabricId: 'fab-1',
        quantity: '0',
      });

      await expect(service.receiveStock(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a warehouse that does not belong to the caller tenant', async () => {
      const warehouseRepository = createFakeWarehouseRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = new InventoryService(createFakeInventoryRepository(), warehouseRepository);
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        fabricId: 'fab-1',
        quantity: '10',
      });

      await expect(service.receiveStock(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a fabric that does not belong to the caller tenant', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        fabricExistsForTenant: jest.fn(async () => false),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        fabricId: 'fab-1',
        quantity: '10',
      });

      await expect(service.receiveStock(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('creates a new InventoryItem when none exists yet for (warehouse, fabric), then applies a RECEIPT', async () => {
      const inventoryRepository = createFakeInventoryRepository();
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        fabricId: 'fab-1',
        quantity: '150',
      });

      await service.receiveStock(dto, TENANT_ID);

      expect(inventoryRepository.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          warehouseId: 'wh-1',
          productVariantId: undefined,
          fabricId: 'fab-1',
        },
      });
      expect(inventoryRepository.applyStockChange).toHaveBeenCalledWith('item-1', TENANT_ID, {
        onHandDelta: '150',
        type: InventoryTransactionType.RECEIPT,
        reason: undefined,
      });
    });

    it('reuses an existing InventoryItem instead of creating a duplicate', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveByWarehouseAndFabric: jest.fn(async () => createItemRow()),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new ReceiveStockDto(), {
        warehouseId: 'wh-1',
        fabricId: 'fab-1',
        quantity: '50',
      });

      await service.receiveStock(dto, TENANT_ID);

      expect(inventoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('adjustStock()', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );
      const dto = Object.assign(new AdjustStockDto(), { delta: '-5' });

      await expect(service.adjustStock('missing', dto, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an adjustment that would push onHand negative ("prevent negative stock")', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () => createItemRow({ onHand: new Prisma.Decimal(10) })),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new AdjustStockDto(), { delta: '-15' });

      await expect(service.adjustStock('item-1', dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryRepository.applyStockChange).not.toHaveBeenCalled();
    });

    it('applies a valid negative adjustment', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () => createItemRow({ onHand: new Prisma.Decimal(10) })),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new AdjustStockDto(), { delta: '-5', reason: 'Damaged units' });

      await service.adjustStock('item-1', dto, TENANT_ID);

      expect(inventoryRepository.applyStockChange).toHaveBeenCalledWith('item-1', TENANT_ID, {
        onHandDelta: '-5',
        type: InventoryTransactionType.ADJUSTMENT,
        reason: 'Damaged units',
      });
    });
  });

  describe('reserveStock()', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );
      const dto = Object.assign(new ReserveStockDto(), { quantity: '3' });

      await expect(service.reserveStock('missing', dto, TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a reservation exceeding availability ("reservation cannot exceed availability")', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () =>
          createItemRow({ onHand: new Prisma.Decimal(10), reserved: new Prisma.Decimal(8) }),
        ),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      // available = 10 - 8 = 2; requesting 3 exceeds it.
      const dto = Object.assign(new ReserveStockDto(), { quantity: '3' });

      await expect(service.reserveStock('item-1', dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryRepository.reserveStock).not.toHaveBeenCalled();
    });

    it('rejects a non-positive quantity', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () => createItemRow()),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new ReserveStockDto(), { quantity: '0' });

      await expect(service.reserveStock('item-1', dto, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reserves stock within availability', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () =>
          createItemRow({ onHand: new Prisma.Decimal(10), reserved: new Prisma.Decimal(2) }),
        ),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      // available = 10 - 2 = 8; requesting 3 is fine.
      const dto = Object.assign(new ReserveStockDto(), { quantity: '3', reference: 'Order hold' });

      await service.reserveStock('item-1', dto, TENANT_ID);

      expect(inventoryRepository.reserveStock).toHaveBeenCalledWith(
        'item-1',
        TENANT_ID,
        { quantity: '3', reference: 'Order hold', notes: undefined },
        undefined,
      );
    });

    it('passes an optional tx through to the repository so a caller (e.g. OrderService) can reserve within its own transaction', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findActiveById: jest.fn(async () =>
          createItemRow({ onHand: new Prisma.Decimal(10), reserved: new Prisma.Decimal(2) }),
        ),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());
      const dto = Object.assign(new ReserveStockDto(), { quantity: '3' });
      const fakeTx = {} as never;

      await service.reserveStock('item-1', dto, TENANT_ID, fakeTx);

      expect(inventoryRepository.reserveStock).toHaveBeenCalledWith(
        'item-1',
        TENANT_ID,
        expect.anything(),
        fakeTx,
      );
    });
  });

  describe('releaseReservation()', () => {
    it('throws NotFoundException when no active reservation exists', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );

      await expect(service.releaseReservation('missing', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('consumeReservation()', () => {
    it('throws NotFoundException when no active reservation exists', async () => {
      const service = new InventoryService(
        createFakeInventoryRepository(),
        createFakeWarehouseRepository(),
      );

      await expect(service.consumeReservation('missing', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is callable directly even with no matching controller route (service-layer-only capability)', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        consumeReservation: jest.fn(async () => ({
          item: createItemRow(),
          reservation: {
            id: 'res-1',
            inventoryItemId: 'item-1',
            quantity: new Prisma.Decimal(3),
            status: 'CONSUMED',
            reference: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());

      const result = await service.consumeReservation('res-1', TENANT_ID);

      expect(result.status).toBe('CONSUMED');
    });
  });

  // Milestone 12 (Performance Engineering) — added alongside the
  // underlying repository rewrite (application-code reduce/filter →
  // database-computed aggregate/`WHERE`); no unit spec existed for
  // either service method before this milestone.
  describe('getStockValuation()', () => {
    it('rounds the repository-computed valuation to 2 decimal places', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        getStockValuationAggregate: jest.fn(async () => ({
          itemCount: 2,
          valuation: new Prisma.Decimal('6225.005'),
        })),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());

      const result = await service.getStockValuation(TENANT_ID);

      expect(result.itemCount).toBe(2);
      expect(result.valuation.toString()).toBe('6225.01');
    });
  });

  describe('getLowStockItems()', () => {
    it('maps whatever the repository returns to response DTOs, with no further filtering', async () => {
      const inventoryRepository = createFakeInventoryRepository({
        findLowStockItems: jest.fn(async () => [
          createItemRow({
            id: 'item-2',
            onHand: new Prisma.Decimal(2),
            reorderPoint: new Prisma.Decimal(5),
          }),
        ]),
      });
      const service = new InventoryService(inventoryRepository, createFakeWarehouseRepository());

      const result = await service.getLowStockItems(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('item-2');
    });
  });
});
