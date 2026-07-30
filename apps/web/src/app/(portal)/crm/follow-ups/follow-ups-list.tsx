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
import { useFollowUps, useFollowUpActions } from '@/features/crm/hooks/use-follow-ups';
import { formatDateTime } from '@/utils/date';
import { CrmNav } from '../crm-nav';
import type { FollowUp, FollowUpStatus } from '@/types/api/crm';

const STATUS_TONE: Record<FollowUpStatus, StatusTone> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'muted',
};

function FollowUpsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'dueAt',
    defaultSortDirection: 'asc',
    filterKeys: ['status'],
  });

  const followUpsQuery = useFollowUps({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as FollowUpStatus | undefined,
    sortBy: params.sortBy as 'createdAt' | 'dueAt' | 'status' | undefined,
    sortDirection: params.sortDirection,
  });
  const actions = useFollowUpActions();

  const columns = useMemo<ColumnDef<FollowUp, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        enableSorting: false,
      },
      {
        accessorKey: 'dueAt',
        header: 'Due',
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.dueAt),
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
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const followUp = row.original;
          if (followUp.status === 'PENDING') {
            return (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => actions.complete.mutate(followUp.id)}
                  disabled={actions.complete.isPending}
                >
                  Complete
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => actions.cancel.mutate(followUp.id)}
                  disabled={actions.cancel.isPending}
                >
                  Cancel
                </Button>
              </div>
            );
          }
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => actions.reopen.mutate(followUp.id)}
              disabled={actions.reopen.isPending}
            >
              Reopen
            </Button>
          );
        },
      },
    ],
    [actions],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Follow-ups" subtitle="Scheduled sales follow-up tasks." />
      <CrmNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search follow-ups..."
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
        data={followUpsQuery.data?.items}
        isLoading={followUpsQuery.isLoading}
        error={followUpsQuery.error}
        onRetry={() => followUpsQuery.refetch()}
        emptyMessage="No follow-ups found."
      />
      {followUpsQuery.data ? (
        <ListPagination
          page={followUpsQuery.data.page}
          limit={followUpsQuery.data.limit}
          total={followUpsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { FollowUpsList };
