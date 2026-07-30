'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listCustomerNotes, createCustomerNote } from '../api/customer-notes';
import { customerNoteKeys } from '../api/query-keys';

export function useCustomerNotes(customerId: string) {
  const params = { customerId, limit: 50, sortDirection: 'desc' as const };
  return useQuery({
    queryKey: customerNoteKeys.list(params),
    queryFn: ({ signal }) => listCustomerNotes(params, signal),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomerNote(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => createCustomerNote({ customerId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerNoteKeys.lists() });
      toast.success('Note added.');
    },
  });
}
