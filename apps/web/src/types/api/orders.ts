import type { SortDirection } from './common';

/**
 * Hand-authored from `apps/api/src/modules/orders/{dto,constants}` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 */
export type OrderStatus =
  'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

/** `orders.constant.ts`'s `ORDER_FORWARD_TRANSITIONS` — the one legal next status per
 * current status, enforced server-side by `POST /orders/:id/status`. `null` = terminal. */
export const ORDER_FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  DRAFT: 'PENDING',
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
};

/** `orders.constant.ts`'s `ORDER_CANCELLABLE_STATUSES` — cancellation is a separate,
 * stricter-permission (`orders:cancel`) route, not reachable via the status transition. */
export const ORDER_CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
];

export interface OrderItem {
  id: string;
  productVariantId: string;
  productCustomizationId: string | null;
  inventoryReservationId: string | null;
  /** Decimal-as-string server-side. */
  quantity: string;
  unitPrice: string;
  pricingAdjustmentsTotal: string;
  lineTotal: string;
  /** Raw JSON column, no server-declared schema (`styleOptionIds`/`monogramOptionId`/
   * `monogramText` in practice, per `order.service.ts`'s `computeCustomizationPricing()`,
   * but not typed server-side). */
  selectedOptions: unknown;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  previousStatus: OrderStatus | null;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on `GET /orders/:id` and every write response; omitted on list rows. */
  items?: OrderItem[];
  /** Populated on `GET /orders/:id` and every write response; omitted on list rows. */
  statusHistory?: OrderStatusHistoryEntry[];
}

export type OrderSortField = 'createdAt' | 'total' | 'status';

export interface OrderListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  /** Matched server-side against the linked Customer's email/firstName/lastName — Order
   * itself has no text field to search. */
  search?: string;
  sortBy?: OrderSortField;
  sortDirection?: SortDirection;
}

export interface CreateOrderItemInput {
  warehouseId: string;
  productVariantId: string;
  /** Decimal-as-string — the backend validates with `@IsNumberString()`, not `@IsNumber()`. */
  quantity: string;
  productCustomizationId?: string;
  selectedOptions?: {
    styleOptionIds?: string[];
    monogramOptionId?: string;
    monogramText?: string;
  };
}

export interface CreateOrderInput {
  customerId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface ChangeOrderStatusInput {
  status: OrderStatus;
  note?: string;
}

export interface CancelOrderInput {
  note?: string;
}
