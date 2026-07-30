'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview } from '../api/dashboard';
import { dashboardKeys } from '../api/query-keys';
import type { DashboardKpiParams } from '@/types/api/admin';

export function useDashboardOverview(params: DashboardKpiParams = {}) {
  return useQuery({
    queryKey: dashboardKeys.list(params),
    queryFn: ({ signal }) => getDashboardOverview(params, signal),
  });
}
