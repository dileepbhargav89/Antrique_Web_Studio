import { Order, OrderItem, OrderStatusHistory } from '../../../../generated/prisma/client';
import { OrderResponseDto } from '../dto/order-response.dto';
import { OrderItemResponseDto } from '../dto/order-item-response.dto';
import { OrderStatusHistoryResponseDto } from '../dto/order-status-history-response.dto';

function toOrderItemResponseDto(item: OrderItem): OrderItemResponseDto {
  return new OrderItemResponseDto(
    item.id,
    item.productVariantId,
    item.productCustomizationId,
    item.inventoryReservationId,
    item.quantity.toString(),
    item.unitPrice.toString(),
    item.pricingAdjustmentsTotal.toString(),
    item.lineTotal.toString(),
    item.selectedOptions,
  );
}

function toOrderStatusHistoryResponseDto(entry: OrderStatusHistory): OrderStatusHistoryResponseDto {
  return new OrderStatusHistoryResponseDto(
    entry.id,
    entry.status,
    entry.previousStatus,
    entry.note,
    entry.createdAt,
  );
}

export function toOrderResponseDto(
  order: Order,
  items?: OrderItem[],
  statusHistory?: OrderStatusHistory[],
): OrderResponseDto {
  return new OrderResponseDto(
    order.id,
    order.customerId,
    order.status,
    order.shippingAddressId,
    order.billingAddressId,
    order.subtotal.toString(),
    order.total.toString(),
    order.notes,
    order.createdAt,
    order.updatedAt,
    items?.map(toOrderItemResponseDto),
    statusHistory?.map(toOrderStatusHistoryResponseDto),
  );
}
