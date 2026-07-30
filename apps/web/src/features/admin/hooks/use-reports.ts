'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listReports, getReport, generateReport } from '../api/reports';
import { reportKeys } from '../api/query-keys';
import type { ReportListParams, GenerateReportInput } from '@/types/api/admin';

export function useReports(params: ReportListParams) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: ({ signal }) => listReports(params, signal),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: ({ signal }) => getReport(id, signal),
    enabled: Boolean(id),
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateReportInput) => generateReport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report generated.');
    },
  });
}
