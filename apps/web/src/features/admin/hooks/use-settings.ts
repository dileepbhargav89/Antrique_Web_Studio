'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getBranding, updateBranding, uploadBrandingLogo } from '../api/settings';
import { settingsKeys } from '../api/query-keys';
import type { UpdateBrandingInput } from '@/types/api/admin';

export function useBranding() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: ({ signal }) => getBranding(signal),
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandingInput) => updateBranding(input),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.all, data);
      toast.success('Branding saved.');
    },
  });
}

export function useUploadBrandingLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadBrandingLogo(file),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.all, data);
      toast.success('Logo uploaded.');
    },
  });
}
