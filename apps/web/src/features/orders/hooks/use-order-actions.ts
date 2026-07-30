'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { changeOrderStatus, cancelOrder } from '../api/orders';
import { orderKeys } from '../api/query-keys';
import type { ChangeOrderStatusInput, CancelOrderInput } from '@/types/api/orders';

/** Mutation-error toasts already happen globally (`config/query.ts`'s `MutationCache`) —
 * these hooks only add the success-path toast the brief asks for. */
export function useChangeOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeOrderStatusInput) => changeOrderStatus(id, input),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.success(`Order moved to ${order.status}.`);
    },
  });
}

export function useCancelOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelOrderInput) => cancelOrder(id, input),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.success('Order cancelled.');
    },
  });
}
