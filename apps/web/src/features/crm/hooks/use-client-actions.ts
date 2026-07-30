'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient, updateClient } from '../api/clients';
import { clientKeys } from '../api/query-keys';
import type { CreateClientInput, UpdateClientInput } from '@/types/api/crm';

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(input),
    onSuccess: (client) => {
      queryClient.setQueryData(clientKeys.detail(client.id), client);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success('Client created.');
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => updateClient(id, input),
    onSuccess: (client) => {
      queryClient.setQueryData(clientKeys.detail(id), client);
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success('Client updated.');
    },
  });
}
