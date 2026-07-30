'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeads } from '@/features/crm/hooks/use-leads';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import { CrmNav } from '../crm-nav';
import type { Lead, LeadSortField, LeadStatus } from '@/types/api/crm';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  NEW: 'info',
  QUALIFIED: 'info',
  QUOTED: 'warning',
  CONVERTED: 'success',
  LOST: 'destructive',
  ARCHIVED: 'muted',
};

interface SortOption {
  value: string;
  label: string;
  sortBy: LeadSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'contactName-asc', label: 'Name (A–Z)', sortBy: 'contactName', sortDirection: 'asc' },
];

function LeadsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const leadsQuery = useLeads({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as LeadStatus | undefined,
    sortBy: params.sortBy as LeadSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Lead, unknown>[]>(
    () => [
      {
        accessorKey: 'contactName',
        header: 'Contact',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.crmLeads}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.contactName}
          </Link>
        ),
      },
      {
        accessorKey: 'contactEmail',
        header: 'Email',
        enableSorting: false,
      },
      {
        accessorKey: 'source',
        header: 'Source',
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
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);
  const sortValue = `${params.sortBy}-${params.sortDirection}`;

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Leads" subtitle="Inbound and prospected sales leads." />
      <CrmNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search leads..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <EnumFilterSelect
              ariaLabel="Filter by status"
              placeholder="Status"
              allLabel="All statuses"
              options={Object.keys(STATUS_TONE)}
              value={params.filters.status}
              onChange={(value) => setParams({ filters: { status: value } })}
            />
            <Select
              value={sortValue}
              onValueChange={(value) => {
                const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
                if (option)
                  setParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
              }}
            >
              <SelectTrigger aria-label="Sort leads">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <ResourceTable
        columns={columns}
        data={leadsQuery.data?.items}
        isLoading={leadsQuery.isLoading}
        error={leadsQuery.error}
        onRetry={() => leadsQuery.refetch()}
        emptyMessage="No leads found."
      />
      {leadsQuery.data ? (
        <ListPagination
          page={leadsQuery.data.page}
          limit={leadsQuery.data.limit}
          total={leadsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { LeadsList };
