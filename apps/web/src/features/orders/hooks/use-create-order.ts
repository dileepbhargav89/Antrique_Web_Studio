'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createOrder } from '../api/orders';
import { orderKeys } from '../api/query-keys';
import type { CreateOrderInput } from '@/types/api/orders';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.success('Order created.');
    },
  });
}
