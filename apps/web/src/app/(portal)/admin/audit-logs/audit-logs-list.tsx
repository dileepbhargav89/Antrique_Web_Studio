'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { ListPagination } from '@/components/data/list-pagination';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ResourceTable } from '@/components/data/resource-table';
import { useListParams } from '@/components/data/use-list-params';
import { useAuditLogs } from '@/features/admin/hooks/use-audit-logs';
import { formatDateTime } from '@/utils/date';
import { AdminNav } from '../admin-nav';
import type { AuditLog } from '@/types/api/admin';

function AuditLogsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
  });

  const auditLogsQuery = useAuditLogs({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        enableSorting: false,
      },
      {
        accessorKey: 'resourceType',
        header: 'Resource',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.resourceId
            ? `${row.original.resourceType} (${row.original.resourceId.slice(0, 8)}…)`
            : row.original.resourceType,
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        enableSorting: false,
        cell: ({ row }) => row.original.ipAddress ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Audit Logs" subtitle="The compliance audit trail." />
      <AdminNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search by action or resource type..."
        hasActiveFilters={Boolean(params.search)}
        onClearFilters={clearFilters}
      />
      <ResourceTable
        columns={columns}
        data={auditLogsQuery.data?.items}
        isLoading={auditLogsQuery.isLoading}
        error={auditLogsQuery.error}
        onRetry={() => auditLogsQuery.refetch()}
        emptyMessage="No audit log entries found."
      />
      {auditLogsQuery.data ? (
        <ListPagination
          page={auditLogsQuery.data.page}
          limit={auditLogsQuery.data.limit}
          total={auditLogsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { AuditLogsList };
