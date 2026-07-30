import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Order,
  OrderListParams,
  CreateOrderInput,
  ChangeOrderStatusInput,
  CancelOrderInput,
} from '@/types/api/orders';

export function listOrders(
  params: OrderListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Order>> {
  return apiClient.get<PaginatedResponse<Order>, OrderListParams>('orders', {
    query: params,
    signal,
  });
}

/** Detail response includes populated `items`/`statusHistory` — list rows omit both. */
export function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return apiClient.get<Order>(`orders/${id}`, { signal });
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiClient.post<Order>('orders', input);
}

export function changeOrderStatus(id: string, input: ChangeOrderStatusInput): Promise<Order> {
  return apiClient.post<Order>(`orders/${id}/status`, input);
}

export function cancelOrder(id: string, input: CancelOrderInput): Promise<Order> {
  return apiClient.post<Order>(`orders/${id}/cancel`, input);
}
