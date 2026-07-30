import { apiClient } from '@/services/api/client';
import type { CustomerActivity } from '@/types/api/crm';

/** Not paginated — the full, chronological feed for exactly one customer
 * (`CustomerActivityTimelineQueryDto` deliberately doesn't extend `PaginationQueryDto`). */
export function getCustomerActivityTimeline(
  customerId: string,
  signal?: AbortSignal,
): Promise<CustomerActivity[]> {
  return apiClient.get<CustomerActivity[]>('customer-activities/timeline', {
    query: { customerId },
    signal,
  });
}
