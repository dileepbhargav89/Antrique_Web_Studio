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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuotations } from '@/features/crm/hooks/use-quotations';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import { CrmNav } from '../crm-nav';
import type { Quotation, QuotationSortField, QuotationStatus } from '@/types/api/crm';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<QuotationStatus, StatusTone> = {
  DRAFT: 'muted',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  EXPIRED: 'warning',
  CONVERTED: 'success',
};

interface SortOption {
  value: string;
  label: string;
  sortBy: QuotationSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  {
    value: 'totalAmount-desc',
    label: 'Highest total',
    sortBy: 'totalAmount',
    sortDirection: 'desc',
  },
];

function QuotationsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const quotationsQuery = useQuotations({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as QuotationStatus | undefined,
    sortBy: params.sortBy as QuotationSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Quotation, unknown>[]>(
    () => [
      {
        accessorKey: 'quotationNumber',
        header: 'Number',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.crmQuotations}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.quotationNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        enableSorting: false,
        cell: ({ row }) => `${row.original.currency} ${row.original.totalAmount}`,
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
        accessorKey: 'validUntil',
        header: 'Valid until',
        enableSorting: false,
        cell: ({ row }) => (row.original.validUntil ? formatDate(row.original.validUntil) : '—'),
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
      <DetailPageHeader
        title="Quotations"
        subtitle="Proposals sent to leads and clients."
        actions={
          <Button asChild>
            <Link href={ROUTES.portal.crmQuotationsNew}>New quotation</Link>
          </Button>
        }
      />
      <CrmNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search by quotation number..."
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
              <SelectTrigger aria-label="Sort quotations">
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
        data={quotationsQuery.data?.items}
        isLoading={quotationsQuery.isLoading}
        error={quotationsQuery.error}
        onRetry={() => quotationsQuery.refetch()}
        emptyMessage="No quotations found."
      />
      {quotationsQuery.data ? (
        <ListPagination
          page={quotationsQuery.data.page}
          limit={quotationsQuery.data.limit}
          total={quotationsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { QuotationsList };
