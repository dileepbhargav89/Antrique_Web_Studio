'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useVendors } from '@/features/finance/hooks/use-vendors';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import { VendorFormDialog } from './vendor-form-dialog';
import type { Vendor, VendorSortField, VendorStatus } from '@/types/api/finance';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<VendorStatus, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  ARCHIVED: 'destructive',
};

interface SortOption {
  value: string;
  label: string;
  sortBy: VendorSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'name-asc', label: 'Name (A–Z)', sortBy: 'name', sortDirection: 'asc' },
];

function VendorsList() {
  const router = useRouter();
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const vendorsQuery = useVendors({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as VendorStatus | undefined,
    sortBy: params.sortBy as VendorSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.financeVendors}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'contactEmail',
        header: 'Email',
        enableSorting: false,
        cell: ({ row }) => row.original.contactEmail ?? '—',
      },
      {
        accessorKey: 'paymentTerms',
        header: 'Payment terms',
        enableSorting: false,
        cell: ({ row }) => row.original.paymentTerms ?? '—',
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
      <DetailPageHeader
        title="Vendors"
        subtitle="Who the agency pays for goods and services."
        actions={
          <VendorFormDialog
            mode="create"
            trigger={<Button type="button">New vendor</Button>}
            onSuccess={(vendor) => router.push(`${ROUTES.portal.financeVendors}/${vendor.id}`)}
          />
        }
      />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search vendors..."
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
              <SelectTrigger aria-label="Sort vendors">
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
        data={vendorsQuery.data?.items}
        isLoading={vendorsQuery.isLoading}
        error={vendorsQuery.error}
        onRetry={() => vendorsQuery.refetch()}
        emptyMessage="No vendors found."
      />
      {vendorsQuery.data ? (
        <ListPagination
          page={vendorsQuery.data.page}
          limit={vendorsQuery.data.limit}
          total={vendorsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { VendorsList };
