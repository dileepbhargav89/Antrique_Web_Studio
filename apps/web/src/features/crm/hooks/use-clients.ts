'use client';

import { useQuery } from '@tanstack/react-query';
import { listClients, getClient } from '../api/clients';
import { clientKeys } from '../api/query-keys';
import type { ClientListParams } from '@/types/api/crm';

export function useClients(params: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: ({ signal }) => listClients(params, signal),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: ({ signal }) => getClient(id, signal),
    enabled: Boolean(id),
  });
}
