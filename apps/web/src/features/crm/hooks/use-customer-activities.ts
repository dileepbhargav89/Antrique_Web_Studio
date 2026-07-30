'use client';

import { useQuery } from '@tanstack/react-query';
import { getCustomerActivityTimeline } from '../api/customer-activities';
import { customerActivityKeys } from '../api/query-keys';

export function useCustomerActivityTimeline(customerId: string) {
  return useQuery({
    queryKey: customerActivityKeys.list({ customerId }),
    queryFn: ({ signal }) => getCustomerActivityTimeline(customerId, signal),
    enabled: Boolean(customerId),
  });
}
