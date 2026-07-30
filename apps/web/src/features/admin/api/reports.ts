import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { Report, ReportListParams, GenerateReportInput } from '@/types/api/admin';

export function listReports(
  params: ReportListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Report>> {
  return apiClient.get<PaginatedResponse<Report>, ReportListParams>('reports', {
    query: params,
    signal,
  });
}

export function getReport(id: string, signal?: AbortSignal): Promise<Report> {
  return apiClient.get<Report>(`reports/${id}`, { signal });
}

/** Synchronous — computes and stores the snapshot immediately, reusing the same
 * calculations as the dashboard overview. */
export function generateReport(input: GenerateReportInput): Promise<Report> {
  return apiClient.post<Report>('reports', input);
}
