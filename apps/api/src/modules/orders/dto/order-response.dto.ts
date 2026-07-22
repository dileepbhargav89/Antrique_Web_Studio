import { OrderStatus } from '../../../../generated/prisma/enums';
import { OrderItemResponseDto } from './order-item-response.dto';
import { OrderStatusHistoryResponseDto } from './order-status-history-response.dto';

// `items`/`statusHistory` optional — same detail-vs-list convention as
// catalog's own ProductResponseDto: GET /orders/:id (detail) populates
// both; GET /orders (list) omits them (a lighter summary — order id/
// customer/status/total is the standard order-list shape, unlike
// ProductCustomization in Milestone 6, where the nested groups WERE the
// primary content).
export class OrderResponseDto {
  constructor(
    readonly id: string,
    readonly customerId: string,
    readonly status: OrderStatus,
    readonly shippingAddressId: string | null,
    readonly billingAddressId: string | null,
    readonly subtotal: string,
    readonly total: string,
    readonly notes: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly items?: OrderItemResponseDto[],
    readonly statusHistory?: OrderStatusHistoryResponseDto[],
  ) {}
}
