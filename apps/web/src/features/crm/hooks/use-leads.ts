'use client';

import { useQuery } from '@tanstack/react-query';
import { listLeads, getLead } from '../api/leads';
import { leadKeys } from '../api/query-keys';
import type { LeadListParams } from '@/types/api/crm';

export function useLeads(params: LeadListParams) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: ({ signal }) => listLeads(params, signal),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) => getLead(id, signal),
    enabled: Boolean(id),
  });
}
