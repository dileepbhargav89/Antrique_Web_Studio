import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryRepository } from './repositories/inventory.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryItemListQueryDto } from './dto/inventory-item-list-query.dto';
import { InventoryTransactionListQueryDto } from './dto/inventory-transaction-list-query.dto';
import { InventoryItemResponseDto } from './dto/inventory-item-response.dto';
import { InventoryReservationResponseDto } from './dto/inventory-reservation-response.dto';
import {
  toInventoryItemResponseDto,
  toInventoryReservationResponseDto,
  toInventoryTransactionResponseDto,
} from './mappers/inventory.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { InventoryTransactionType } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isCheckConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping. This milestone's
// own "Business Rules" live here:
// - "Available = OnHand − Reserved" — computed in the mapper, not here
//   (see inventory.mapper.ts's own comment).
// - "Reserved ≤ OnHand" / "OnHand ≥ 0" / "Reservation cannot exceed
//   availability" / "Prevent negative stock" / "Prevent over-reservation"
//   — every mutating method here PRE-CHECKS the resulting counters
//   before writing, throwing a clear `BadRequestException`; the
//   database's own CHECK constraints (`20260721100000_add_inventory_
//   management`) are the race-free backstop for a genuine concurrent-
//   write race, translated via `isCheckConstraintViolation()` into a
//   `ConflictException` rather than a raw 500.
// - "Transactions are append-only" / "Stock changes always create
//   transaction records" — every mutation here delegates to
//   `InventoryRepository`'s own atomic methods
//   (`applyStockChange()`/`reserveStock()`/`releaseReservation()`/
//   `consumeReservation()`), each of which writes the counter update and
//   the ledger row in ONE database transaction — this service never
//   mutates `InventoryItem.onHand`/`reserved` any other way.
@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly warehouseRepository: WarehouseRepository,
  ) {}

  async getStock(id: string, tenantId: string): Promise<InventoryItemResponseDto> {
    const item = await this.inventoryRepository.findActiveById(id, tenantId);
    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }
    return toInventoryItemResponseDto(item);
  }

  // Milestone 8 — `OrderService` needs the raw InventoryItem row (not a
  // mapped response DTO) to resolve which stock record a given order
  // line reserves against, before it has a reservation to build a
  // response around. Deliberately does NOT find-or-create (unlike
  // `receiveStock()`) — ordering against a variant with no tracked
  // inventory in the requested warehouse is a real error, not something
  // to silently paper over with a zero-stock row.
  findItemForVariant(warehouseId: string, productVariantId: string, tenantId: string) {
    return this.inventoryRepository.findActiveByWarehouseAndVariant(
      warehouseId,
      productVariantId,
      tenantId,
    );
  }

  async listStock(
    query: InventoryItemListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<InventoryItemResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.InventoryItemWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.productVariantId ? { productVariantId: query.productVariantId } : {}),
      ...(query.fabricId ? { fabricId: query.fabricId } : {}),
      ...(query.supplierId
        ? {
            OR: [
              { productVariant: { supplierProducts: { some: { supplierId: query.supplierId } } } },
              { fabric: { supplierProducts: { some: { supplierId: query.supplierId } } } },
            ],
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { productVariant: { sku: { contains: query.search, mode: 'insensitive' } } },
              { fabric: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.inventoryRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toInventoryItemResponseDto), total, page, limit);
  }

  async receiveStock(dto: ReceiveStockDto, tenantId: string): Promise<InventoryItemResponseDto> {
    this.assertVariantXorFabric(dto.productVariantId, dto.fabricId);
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('quantity must be greater than zero');
    }

    const warehouse = await this.warehouseRepository.findActiveById(dto.warehouseId, tenantId);
    if (!warehouse) {
      throw new BadRequestException(`Warehouse ${dto.warehouseId} not found`);
    }
    if (dto.productVariantId) {
      const exists = await this.inventoryRepository.productVariantExistsForTenant(
        dto.productVariantId,
        tenantId,
      );
      if (!exists) {
        throw new BadRequestException(`Product variant ${dto.productVariantId} not found`);
      }
    }
    if (dto.fabricId) {
      const exists = await this.inventoryRepository.fabricExistsForTenant(dto.fabricId, tenantId);
      if (!exists) {
        throw new BadRequestException(`Fabric ${dto.fabricId} not found`);
      }
    }

    let item = dto.productVariantId
      ? await this.inventoryRepository.findActiveByWarehouseAndVariant(
          dto.warehouseId,
          dto.productVariantId,
          tenantId,
        )
      : await this.inventoryRepository.findActiveByWarehouseAndFabric(
          dto.warehouseId,
          dto.fabricId!,
          tenantId,
        );

    if (!item) {
      item = await this.inventoryRepository.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          productVariantId: dto.productVariantId,
          fabricId: dto.fabricId,
        },
      });
    }

    try {
      const updated = await this.inventoryRepository.applyStockChange(item.id, tenantId, {
        onHandDelta: dto.quantity,
        type: InventoryTransactionType.RECEIPT,
        reason: dto.reason,
      });
      return toInventoryItemResponseDto(updated!);
    } catch (error) {
      if (isCheckConstraintViolation(error)) {
        throw new ConflictException('This receipt would violate an inventory constraint');
      }
      throw error;
    }
  }

  async adjustStock(
    id: string,
    dto: AdjustStockDto,
    tenantId: string,
  ): Promise<InventoryItemResponseDto> {
    const item = await this.inventoryRepository.findActiveById(id, tenantId);
    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    const delta = new Prisma.Decimal(dto.delta);
    const resultingOnHand = item.onHand.add(delta);
    if (resultingOnHand.lt(0)) {
      throw new BadRequestException(
        `Adjustment would result in negative on-hand stock (${item.onHand.toString()} + ${dto.delta} = ${resultingOnHand.toString()})`,
      );
    }

    try {
      const updated = await this.inventoryRepository.applyStockChange(id, tenantId, {
        onHandDelta: dto.delta,
        type: InventoryTransactionType.ADJUSTMENT,
        reason: dto.reason,
      });
      return toInventoryItemResponseDto(updated!);
    } catch (error) {
      if (isCheckConstraintViolation(error)) {
        throw new ConflictException('This adjustment would violate an inventory constraint');
      }
      throw error;
    }
  }

  // `tx` (Milestone 8) — when provided, the reservation is written using
  // the CALLER's own open transaction instead of opening a new one, so
  // `OrderService.create()` can reserve inventory for every order line
  // and create the Order itself as ONE atomic unit ("Execute everything
  // within a single transaction," Milestone 8's own requirement). Omit
  // it for the standalone `POST /inventory/:id/reserve` route, unchanged
  // from Milestone 7.
  async reserveStock(
    id: string,
    dto: ReserveStockDto,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryItemResponseDto> {
    const result = await this.reserveStockInternal(
      id,
      { quantity: dto.quantity, reference: dto.reference, notes: dto.notes },
      tenantId,
      tx,
    );
    return toInventoryItemResponseDto(result.item);
  }

  // Milestone 8 — `OrderService.create()`'s own entry point: same
  // pre-checks and atomicity as `reserveStock()` above, but returns the
  // raw reservation id (not a mapped `InventoryItemResponseDto`) —
  // `OrderItem.inventoryReservationId` needs the id itself, not a
  // response shape built for the REST endpoint. `tx` is required here
  // (not optional) — this method only ever runs as part of
  // `OrderService.create()`'s own open transaction, never standalone.
  async reserveStockForOrder(
    inventoryItemId: string,
    quantity: string,
    tenantId: string,
    tx: Prisma.TransactionClient,
    reference?: string,
  ): Promise<{ reservationId: string }> {
    const result = await this.reserveStockInternal(
      inventoryItemId,
      { quantity, reference },
      tenantId,
      tx,
    );
    return { reservationId: result.reservation.id };
  }

  private async reserveStockInternal(
    id: string,
    params: { quantity: string; reference?: string; notes?: string },
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const item = await this.inventoryRepository.findActiveById(id, tenantId);
    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    const quantity = new Prisma.Decimal(params.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('quantity must be greater than zero');
    }
    const resultingReserved = item.reserved.add(quantity);
    if (resultingReserved.gt(item.onHand)) {
      throw new BadRequestException(
        `Reservation would exceed availability (available: ${item.onHand.sub(item.reserved).toString()}, requested: ${params.quantity})`,
      );
    }

    try {
      const result = await this.inventoryRepository.reserveStock(id, tenantId, params, tx);
      return result!;
    } catch (error) {
      if (isCheckConstraintViolation(error)) {
        throw new ConflictException('This reservation would violate an inventory constraint');
      }
      throw error;
    }
  }

  // `tx` (Milestone 8) — same reasoning as reserveStock() above:
  // `OrderService.cancel()` releases every reservation on the order's
  // items and records the CANCELLED status transition as one atomic
  // unit ("During cancellation: Release inventory reservations, Record
  // status transition," Milestone 8's own requirement).
  async releaseReservation(
    reservationId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryReservationResponseDto> {
    const result = await this.inventoryRepository.releaseReservation(reservationId, tenantId, tx);
    if (!result) {
      throw new NotFoundException(`Active reservation ${reservationId} not found`);
    }
    return toInventoryReservationResponseDto(result.reservation);
  }

  // No controller route this milestone — Milestone 7's own brief's
  // "Controllers" list had no "Consume reservation" entry (only "Release
  // reservation" did), even though "Consume reservation" was listed as a
  // required Service Layer capability. That predicted future caller is
  // now real: Milestone 8's `OrderService.changeStatus()` calls this
  // (with `tx`) when an order reaches COMPLETED — the reserved stock
  // actually leaving inventory for good. See
  // docs/implementation/decisions.md.
  async consumeReservation(
    reservationId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryReservationResponseDto> {
    const result = await this.inventoryRepository.consumeReservation(reservationId, tenantId, tx);
    if (!result) {
      throw new NotFoundException(`Active reservation ${reservationId} not found`);
    }
    return toInventoryReservationResponseDto(result.reservation);
  }

  async listTransactions(query: InventoryTransactionListQueryDto, tenantId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.InventoryTransactionWhereInput = {
      ...(query.inventoryItemId ? { inventoryItemId: query.inventoryItemId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.warehouseId ? { inventoryItem: { warehouseId: query.warehouseId } } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const { items, total } = await this.inventoryRepository.findTransactionsPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map(toInventoryTransactionResponseDto),
      total,
      page,
      limit,
    );
  }

  private assertVariantXorFabric(
    productVariantId: string | undefined,
    fabricId: string | undefined,
  ): void {
    if (Boolean(productVariantId) === Boolean(fabricId)) {
      throw new BadRequestException('Exactly one of productVariantId or fabricId must be provided');
    }
  }

  // Milestone 11 — "Inventory: Stock valuation" analytics, reused by
  // AdminModule's own DashboardService/ReportingService rather than
  // duplicated. See InventoryRepository.getStockValuationAggregate()'s
  // own comment for why fabric-linked items are excluded, and for
  // Milestone 12's rewrite from an application-code reduce to a
  // database-computed SUM.
  async getStockValuation(
    tenantId: string,
  ): Promise<{ itemCount: number; valuation: Prisma.Decimal }> {
    const result = await this.inventoryRepository.getStockValuationAggregate(tenantId);
    return { itemCount: result.itemCount, valuation: result.valuation.toDecimalPlaces(2) };
  }

  // Milestone 11 — "Inventory: Low stock items" analytics. Milestone 12
  // (Performance Engineering) moved the `onHand <= reorderPoint`
  // comparison into the database query itself (see
  // InventoryRepository.findLowStockItems()'s own comment) — this method
  // no longer fetches every item with a reorder point set just to
  // discard most of them in application code.
  async getLowStockItems(tenantId: string): Promise<InventoryItemResponseDto[]> {
    const lowStock = await this.inventoryRepository.findLowStockItems(tenantId);
    return lowStock.map(toInventoryItemResponseDto);
  }
}
