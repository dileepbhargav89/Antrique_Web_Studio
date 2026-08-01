'use client';

import { useQuery } from '@tanstack/react-query';
import { listContactRequests, getContactRequest } from '../api/contact-requests';
import { contactRequestKeys } from '../api/query-keys';
import type { ContactRequestListParams } from '@/types/api/crm';

export function useContactRequests(params: ContactRequestListParams) {
  return useQuery({
    queryKey: contactRequestKeys.list(params),
    queryFn: ({ signal }) => listContactRequests(params, signal),
  });
}

export function useContactRequest(id: string) {
  return useQuery({
    queryKey: contactRequestKeys.detail(id),
    queryFn: ({ signal }) => getContactRequest(id, signal),
    enabled: Boolean(id),
  });
}
