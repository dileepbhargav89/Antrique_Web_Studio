'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { convertContactRequest } from '../api/contact-requests';
import { contactRequestKeys, leadKeys } from '../api/query-keys';
import type { ConvertContactRequestInput } from '@/types/api/crm';

export function useConvertContactRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConvertContactRequestInput) => convertContactRequest(id, input),
    onSuccess: (contactRequest) => {
      queryClient.setQueryData(contactRequestKeys.detail(id), contactRequest);
      queryClient.invalidateQueries({ queryKey: contactRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      toast.success('Converted to a lead.');
    },
  });
}
