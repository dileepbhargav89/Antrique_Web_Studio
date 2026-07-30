'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import { Button } from '@/components/ui/button';
import { useNotifications, useRetryNotification } from '@/features/admin/hooks/use-notifications';
import { formatDateTime } from '@/utils/date';
import { AdminNav } from '../admin-nav';
import type { Notification, NotificationStatus } from '@/types/api/admin';

const STATUS_TONE: Record<NotificationStatus, StatusTone> = {
  PENDING: 'muted',
  QUEUED: 'info',
  SENT: 'success',
  FAILED: 'destructive',
};

function NotificationsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const notificationsQuery = useNotifications({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as NotificationStatus | undefined,
    sortBy: params.sortBy as 'createdAt' | 'status' | undefined,
    sortDirection: params.sortDirection,
  });
  const retryNotification = useRetryNotification();

  const columns = useMemo<ColumnDef<Notification, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        enableSorting: false,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        enableSorting: false,
      },
      {
        accessorKey: 'channel',
        header: 'Channel',
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === 'FAILED' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => retryNotification.mutate(row.original.id)}
              disabled={retryNotification.isPending}
            >
              Retry
            </Button>
          ) : null,
      },
    ],
    [retryNotification],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Notifications" subtitle="Admin-wide notification delivery log." />
      <AdminNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search notifications..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <EnumFilterSelect
            ariaLabel="Filter by status"
            placeholder="Status"
            allLabel="All statuses"
            options={Object.keys(STATUS_TONE)}
            value={params.filters.status}
            onChange={(value) => setParams({ filters: { status: value } })}
          />
        }
      />
      <ResourceTable
        columns={columns}
        data={notificationsQuery.data?.items}
        isLoading={notificationsQuery.isLoading}
        error={notificationsQuery.error}
        onRetry={() => notificationsQuery.refetch()}
        emptyMessage="No notifications found."
      />
      {notificationsQuery.data ? (
        <ListPagination
          page={notificationsQuery.data.page}
          limit={notificationsQuery.data.limit}
          total={notificationsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { NotificationsList };
