'use client';

import { useQuery } from '@tanstack/react-query';
import { listCategories, getCategory } from '../api/categories';
import { categoryKeys } from '../api/query-keys';
import type { CategoryListParams } from '@/types/api/catalog';

export function useCategories(params: CategoryListParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: ({ signal }) => listCategories(params, signal),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: ({ signal }) => getCategory(id, signal),
    enabled: Boolean(id),
  });
}
