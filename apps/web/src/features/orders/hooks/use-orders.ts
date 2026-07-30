'use client';

import { useQuery } from '@tanstack/react-query';
import { listOrders, getOrder } from '../api/orders';
import { orderKeys } from '../api/query-keys';
import type { OrderListParams } from '@/types/api/orders';

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: ({ signal }) => listOrders(params, signal),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => getOrder(id, signal),
    enabled: Boolean(id),
  });
}
