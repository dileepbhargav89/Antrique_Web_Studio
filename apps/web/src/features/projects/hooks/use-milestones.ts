'use client';

import { useQuery } from '@tanstack/react-query';
import { listMilestones } from '../api/milestones';
import { milestoneKeys } from '../api/query-keys';
import type { MilestoneListParams } from '@/types/api/projects';

export function useMilestones(params: MilestoneListParams) {
  return useQuery({
    queryKey: milestoneKeys.list(params),
    queryFn: ({ signal }) => listMilestones(params, signal),
    enabled: Boolean(params.projectId),
  });
}
