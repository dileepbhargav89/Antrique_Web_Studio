'use client';

import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from '../api/audit-logs';
import { auditLogKeys } from '../api/query-keys';
import type { AuditLogListParams } from '@/types/api/admin';

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: ({ signal }) => listAuditLogs(params, signal),
  });
}
