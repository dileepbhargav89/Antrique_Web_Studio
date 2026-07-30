import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Customer, CustomerListParams } from '@/types/api/customers';

export function getCustomer(id: string, signal?: AbortSignal): Promise<Customer> {
  return apiClient.get<Customer>(`customers/${id}`, { signal });
}

export function listCustomers(
  params: CustomerListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Customer>> {
  return apiClient.get<PaginatedResponse<Customer>, CustomerListParams>('customers', {
    query: params,
    signal,
  });
}
