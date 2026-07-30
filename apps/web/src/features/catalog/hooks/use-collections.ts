'use client';

import { useQuery } from '@tanstack/react-query';
import { listCollections, getCollection } from '../api/collections';
import { collectionKeys } from '../api/query-keys';
import type { CollectionListParams } from '@/types/api/catalog';

export function useCollections(params: CollectionListParams) {
  return useQuery({
    queryKey: collectionKeys.list(params),
    queryFn: ({ signal }) => listCollections(params, signal),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: ({ signal }) => getCollection(id, signal),
    enabled: Boolean(id),
  });
}
