import { apiClient } from '@/services/api/client';
import type { DashboardOverview, DashboardKpiParams } from '@/types/api/admin';

export function getDashboardOverview(
  params: DashboardKpiParams,
  signal?: AbortSignal,
): Promise<DashboardOverview> {
  return apiClient.get<DashboardOverview, DashboardKpiParams>('dashboard/overview', {
    query: params,
    signal,
  });
}
