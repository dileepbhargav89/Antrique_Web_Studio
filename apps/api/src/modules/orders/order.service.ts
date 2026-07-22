import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderRepository } from './repositories/order.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { ProductCustomizationRepository } from '../bespoke/repositories/product-customization.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { toOrderResponseDto } from './mappers/order.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ORDER_CANCELLABLE_STATUSES, ORDER_FORWARD_TRANSITIONS } from './constants/orders.constant';
import { OrderStatus } from '../../../generated/prisma/enums';
import {
  Prisma,
  MonogramOption,
  PricingAdjustment,
  StyleOption,
  StyleOptionGroup,
} from '../../../generated/prisma/client';

type StyleOptionGroupWithOptions = StyleOptionGroup & { styleOptions: StyleOption[] };
type CustomizationWithRelations = {
  productId: string;
  styleOptionGroups: StyleOptionGroupWithOptions[];
  pricingAdjustments: PricingAdjustment[];
  monogramOptions: MonogramOption[];
};

// The orchestration layer — this milestone's own framing: "coordinates
// existing domains rather than reimplementing their logic." No pricing
// engine (line totals computed once here, stored, never recomputed on
// read), no duplicate stock tracking (every reservation is a REAL
// InventoryReservation, created through InventoryService).
//
// "Execute everything within a single transaction" (order creation) and
// the equivalent atomicity for cancellation/completion are the reasons
// InventoryRepository/InventoryService now accept an optional
// `tx: Prisma.TransactionClient` (see those files' own Milestone 8
// comments) — `create()`/`changeStatus()`/`cancel()` below all open ONE
// transaction via `OrderRepository.runInTransaction()` and pass that same
// `tx` into every InventoryService call, so the order's own rows and its
// inventory side-effects commit or roll back together.
//
// This milestone's own "Business Rules" during creation — "Validate
// customer," "Validate product variants," "Validate bespoke
// customization," "Validate pricing adjustments" — are each a distinct
// private assertion below, run BEFORE the transaction opens (fail fast,
// no wasted reservation/rollback for a request that was never going to
// succeed).
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
    private readonly productCustomizationRepository: ProductCustomizationRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(dto: CreateOrderDto, tenantId: string): Promise<OrderResponseDto> {
    const customer = await this.customerRepository.findActiveById(dto.customerId, tenantId);
    if (!customer) {
      throw new BadRequestException(`Customer ${dto.customerId} not found`);
    }
    this.assertAddressBelongsToCustomer(dto.shippingAddressId, customer.addresses);
    this.assertAddressBelongsToCustomer(dto.billingAddressId, customer.addresses);

    const preparedItems: Array<{
      warehouseId: string;
      productVariantId: string;
      productCustomizationId?: string;
      selectedOptions?: Record<string, unknown>;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      pricingAdjustmentsTotal: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      inventoryItemId: string;
    }> = [];

    // Milestone 12 (Performance Engineering) — one batched
    // `findVariantsByIds()` call instead of one `findVariantById()` per
    // order item inside the loop below (an N+1 on the checkout hot
    // path). `Set` first — the same variant can legitimately appear on
    // more than one line (see create-order.dto's own validation).
    const variantIds = [...new Set(dto.items.map((itemDto) => itemDto.productVariantId))];
    const variants = await this.productRepository.findVariantsByIds(variantIds, tenantId);
    const variantById = new Map(variants.map((v) => [v.id, v]));

    for (const itemDto of dto.items) {
      const quantity = new Prisma.Decimal(itemDto.quantity);
      if (quantity.lte(0)) {
        throw new BadRequestException('quantity must be greater than zero');
      }

      // "Validate product variants"
      const variant = variantById.get(itemDto.productVariantId);
      if (!variant) {
        throw new BadRequestException(`Product variant ${itemDto.productVariantId} not found`);
      }

      // "Validate bespoke customization" / "Validate pricing adjustments"
      let pricingAdjustmentsTotal = new Prisma.Decimal(0);
      if (itemDto.productCustomizationId) {
        const customization = await this.productCustomizationRepository.findActiveById(
          itemDto.productCustomizationId,
          tenantId,
        );
        if (!customization) {
          throw new BadRequestException(
            `Product customization ${itemDto.productCustomizationId} not found`,
          );
        }
        if (customization.productId !== variant.productId) {
          throw new BadRequestException(
            `Product customization ${itemDto.productCustomizationId} does not belong to the same product as variant ${itemDto.productVariantId}`,
          );
        }
        pricingAdjustmentsTotal = this.computeCustomizationPricing(
          itemDto.selectedOptions,
          customization,
        );
      } else if (itemDto.selectedOptions) {
        throw new BadRequestException('selectedOptions requires productCustomizationId');
      }

      const inventoryItem = await this.inventoryService.findItemForVariant(
        itemDto.warehouseId,
        itemDto.productVariantId,
        tenantId,
      );
      if (!inventoryItem) {
        throw new BadRequestException(
          `No inventory tracked for product variant ${itemDto.productVariantId} in warehouse ${itemDto.warehouseId}`,
        );
      }

      const lineTotal = variant.price.mul(quantity).add(pricingAdjustmentsTotal);

      preparedItems.push({
        warehouseId: itemDto.warehouseId,
        productVariantId: itemDto.productVariantId,
        productCustomizationId: itemDto.productCustomizationId,
        selectedOptions: itemDto.selectedOptions,
        quantity,
        unitPrice: variant.price,
        pricingAdjustmentsTotal,
        lineTotal,
        inventoryItemId: inventoryItem.id,
      });
    }

    const subtotal = preparedItems.reduce((sum, p) => sum.add(p.lineTotal), new Prisma.Decimal(0));

    // "Reserve inventory through InventoryService" + "Create Order +
    // OrderItems" + "Record initial status" — "Execute everything within
    // a single transaction."
    const order = await this.orderRepository.runInTransaction(async (tx) => {
      const itemsCreateData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
      for (const p of preparedItems) {
        const { reservationId } = await this.inventoryService.reserveStockForOrder(
          p.inventoryItemId,
          p.quantity.toString(),
          tenantId,
          tx,
          `order-item:${p.productVariantId}`,
        );
        itemsCreateData.push({
          tenantId,
          productVariantId: p.productVariantId,
          productCustomizationId: p.productCustomizationId,
          inventoryReservationId: reservationId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          pricingAdjustmentsTotal: p.pricingAdjustmentsTotal,
          lineTotal: p.lineTotal,
          selectedOptions: p.selectedOptions as Prisma.InputJsonValue | undefined,
        });
      }

      return this.orderRepository.createInTx(tx, {
        tenantId,
        customerId: dto.customerId,
        status: OrderStatus.DRAFT,
        shippingAddressId: dto.shippingAddressId,
        billingAddressId: dto.billingAddressId,
        subtotal,
        total: subtotal,
        notes: dto.notes,
        items: { create: itemsCreateData },
        statusHistory: { create: [{ tenantId, status: OrderStatus.DRAFT, previousStatus: null }] },
      });
    });

    return toOrderResponseDto(order, order.items, order.statusHistory);
  }

  async findById(id: string, tenantId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findActiveById(id, tenantId);
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return toOrderResponseDto(order, order.items, order.statusHistory);
  }

  async list(
    query: OrderListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.OrderWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            customer: {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' } },
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const { items, total } = await this.orderRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toOrderResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, dto: UpdateOrderDto, tenantId: string): Promise<OrderResponseDto> {
    const existing = await this.orderRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    const customer = await this.customerRepository.findActiveById(existing.customerId, tenantId);
    this.assertAddressBelongsToCustomer(dto.shippingAddressId, customer?.addresses ?? []);
    this.assertAddressBelongsToCustomer(dto.billingAddressId, customer?.addresses ?? []);

    const updated = await this.orderRepository.update({
      where: { id },
      data: {
        shippingAddressId: dto.shippingAddressId,
        billingAddressId: dto.billingAddressId,
        notes: dto.notes,
      },
    });
    const fresh = await this.orderRepository.findActiveById(id, tenantId);
    return toOrderResponseDto(fresh ?? updated, fresh?.items, fresh?.statusHistory);
  }

  // "No status mutation without history" — status update and the
  // OrderStatusHistory row are written in the same transaction as any
  // inventory side-effect (consuming reservations on COMPLETED).
  async changeStatus(
    id: string,
    dto: ChangeOrderStatusDto,
    tenantId: string,
  ): Promise<OrderResponseDto> {
    const existing = await this.orderRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    const expectedNext = ORDER_FORWARD_TRANSITIONS[existing.status];
    if (expectedNext !== dto.status) {
      throw new BadRequestException(
        `Cannot change order status from ${existing.status} to ${dto.status} — the only valid forward transition is ${expectedNext ?? 'none (terminal status)'}. Use the dedicated cancel endpoint to cancel an order.`,
      );
    }

    await this.orderRepository.runInTransaction(async (tx) => {
      await this.orderRepository.updateStatusInTx(tx, id, dto.status);
      await this.orderRepository.addStatusHistoryInTx(
        tx,
        tenantId,
        id,
        dto.status,
        existing.status,
        dto.note,
      );

      // Reaching COMPLETED is when reserved stock actually leaves
      // inventory for good — the same "future caller" Milestone 7's own
      // `InventoryService.consumeReservation()` was built for.
      if (dto.status === OrderStatus.COMPLETED) {
        for (const item of existing.items) {
          if (item.inventoryReservationId) {
            await this.inventoryService.consumeReservation(
              item.inventoryReservationId,
              tenantId,
              tx,
            );
          }
        }
      }
    });

    const updated = await this.orderRepository.findActiveById(id, tenantId);
    return toOrderResponseDto(updated!, updated!.items, updated!.statusHistory);
  }

  // "During cancellation: Release inventory reservations, Record status
  // transition" — this milestone's own explicit requirement, both in the
  // same transaction.
  async cancel(id: string, dto: CancelOrderDto, tenantId: string): Promise<OrderResponseDto> {
    const existing = await this.orderRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    if (!(ORDER_CANCELLABLE_STATUSES as readonly string[]).includes(existing.status)) {
      throw new BadRequestException(
        `Order ${id} cannot be cancelled from status ${existing.status}`,
      );
    }

    await this.orderRepository.runInTransaction(async (tx) => {
      for (const item of existing.items) {
        if (item.inventoryReservationId) {
          await this.inventoryService.releaseReservation(item.inventoryReservationId, tenantId, tx);
        }
      }
      await this.orderRepository.updateStatusInTx(tx, id, OrderStatus.CANCELLED);
      await this.orderRepository.addStatusHistoryInTx(
        tx,
        tenantId,
        id,
        OrderStatus.CANCELLED,
        existing.status,
        dto.note,
      );
    });

    const updated = await this.orderRepository.findActiveById(id, tenantId);
    return toOrderResponseDto(updated!, updated!.items, updated!.statusHistory);
  }

  private assertAddressBelongsToCustomer(
    addressId: string | undefined,
    addresses: Array<{ id: string }>,
  ): void {
    if (!addressId) {
      return;
    }
    if (!addresses.some((a) => a.id === addressId)) {
      throw new BadRequestException(`Address ${addressId} does not belong to this customer`);
    }
  }

  private computeCustomizationPricing(
    selectedOptions: Record<string, unknown> | undefined,
    customization: CustomizationWithRelations,
  ): Prisma.Decimal {
    let total = new Prisma.Decimal(0);
    if (!selectedOptions) {
      return total;
    }

    const allStyleOptionIds = new Set(
      customization.styleOptionGroups.flatMap((g) => g.styleOptions.map((o) => o.id)),
    );
    const styleOptionIds = Array.isArray(selectedOptions.styleOptionIds)
      ? (selectedOptions.styleOptionIds as unknown[]).filter(
          (v): v is string => typeof v === 'string',
        )
      : [];
    for (const optionId of styleOptionIds) {
      if (!allStyleOptionIds.has(optionId)) {
        throw new BadRequestException(
          `Style option ${optionId} does not belong to the selected product's customization`,
        );
      }
    }
    for (const adjustment of customization.pricingAdjustments) {
      if (
        adjustment.isActive &&
        adjustment.styleOptionId &&
        styleOptionIds.includes(adjustment.styleOptionId)
      ) {
        total = total.add(adjustment.amount);
      }
    }

    const monogramOptionId =
      typeof selectedOptions.monogramOptionId === 'string'
        ? selectedOptions.monogramOptionId
        : undefined;
    const monogramText =
      typeof selectedOptions.monogramText === 'string' ? selectedOptions.monogramText : undefined;
    if (monogramOptionId) {
      const monogram = customization.monogramOptions.find((m) => m.id === monogramOptionId);
      if (!monogram) {
        throw new BadRequestException(
          `Monogram option ${monogramOptionId} does not belong to the selected product's customization`,
        );
      }
      if (monogramText && monogramText.length > monogram.maxCharacters) {
        throw new BadRequestException(
          `Monogram text exceeds the maximum of ${monogram.maxCharacters} characters`,
        );
      }
      if (monogram.isActive) {
        total = total.add(monogram.priceAdjustment);
      }
    }

    return total;
  }
}
