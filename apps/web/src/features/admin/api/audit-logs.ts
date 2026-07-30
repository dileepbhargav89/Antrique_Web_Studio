import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { AuditLog, AuditLogListParams } from '@/types/api/admin';

export function listAuditLogs(
  params: AuditLogListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AuditLog>> {
  return apiClient.get<PaginatedResponse<AuditLog>, AuditLogListParams>('audit-logs', {
    query: params,
    signal,
  });
}
