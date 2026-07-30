'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createVendor, updateVendor } from '../api/vendors';
import { vendorKeys } from '../api/query-keys';
import type { CreateVendorInput, UpdateVendorInput } from '@/types/api/finance';

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => createVendor(input),
    onSuccess: (vendor) => {
      queryClient.setQueryData(vendorKeys.detail(vendor.id), vendor);
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success('Vendor created.');
    },
  });
}

export function useUpdateVendor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVendorInput) => updateVendor(id, input),
    onSuccess: (vendor) => {
      queryClient.setQueryData(vendorKeys.detail(id), vendor);
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      toast.success('Vendor updated.');
    },
  });
}
