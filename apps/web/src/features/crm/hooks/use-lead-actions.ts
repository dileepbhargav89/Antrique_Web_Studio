'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { archiveLead, convertLead, convertLeadToClient } from '../api/leads';
import { leadKeys, clientKeys } from '../api/query-keys';
import type { ArchiveLeadInput, ConvertLeadInput, ConvertLeadToClientInput } from '@/types/api/crm';

export function useArchiveLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArchiveLeadInput) => archiveLead(id, input),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadKeys.detail(id), lead);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      toast.success('Lead archived.');
    },
  });
}

export function useConvertLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConvertLeadInput) => convertLead(id, input),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadKeys.detail(id), lead);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      toast.success('Lead converted to customer.');
    },
  });
}

export function useConvertLeadToClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConvertLeadToClientInput) => convertLeadToClient(id, input),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadKeys.detail(id), lead);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success('Lead converted to client.');
    },
  });
}
