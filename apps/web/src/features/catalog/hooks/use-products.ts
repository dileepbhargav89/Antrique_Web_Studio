'use client';

import { useQuery } from '@tanstack/react-query';
import { listProducts, getProduct } from '../api/products';
import { productKeys } from '../api/query-keys';
import type { ProductListParams } from '@/types/api/catalog';

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => listProducts(params, signal),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => getProduct(id, signal),
    enabled: Boolean(id),
  });
}
