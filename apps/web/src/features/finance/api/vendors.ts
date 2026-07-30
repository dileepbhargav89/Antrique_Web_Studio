import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type {
  Vendor,
  VendorListParams,
  CreateVendorInput,
  UpdateVendorInput,
} from '@/types/api/finance';

export function listVendors(
  params: VendorListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Vendor>> {
  return apiClient.get<PaginatedResponse<Vendor>, VendorListParams>('vendors', {
    query: params,
    signal,
  });
}

export function getVendor(id: string, signal?: AbortSignal): Promise<Vendor> {
  return apiClient.get<Vendor>(`vendors/${id}`, { signal });
}

export function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return apiClient.post<Vendor>('vendors', input);
}

export function updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
  return apiClient.patch<Vendor>(`vendors/${id}`, input);
}
