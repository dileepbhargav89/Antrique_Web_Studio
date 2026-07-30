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
import { useWarehouses } from '@/features/inventory/hooks/use-warehouses';
import { ROUTES } from '@/config/routes';
import { InventoryNav } from '../inventory-nav';
import type { Warehouse, WarehouseStatus } from '@/types/api/inventory';

const STATUS_TONE: Record<WarehouseStatus, StatusTone> = {
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

function WarehousesList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'name',
    defaultSortDirection: 'asc',
    filterKeys: ['status'],
  });

  const warehousesQuery = useWarehouses({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as WarehouseStatus | undefined,
    sortBy: params.sortBy as 'name' | 'createdAt' | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.inventoryWarehouses}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        enableSorting: false,
        cell: ({ row }) =>
          [row.original.city, row.original.country].filter(Boolean).join(', ') || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />
        ),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Warehouses" subtitle="Fulfillment locations." />
      <InventoryNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search warehouses..."
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
        data={warehousesQuery.data?.items}
        isLoading={warehousesQuery.isLoading}
        error={warehousesQuery.error}
        onRetry={() => warehousesQuery.refetch()}
        emptyMessage="No warehouses found."
      />
      {warehousesQuery.data ? (
        <ListPagination
          page={warehousesQuery.data.page}
          limit={warehousesQuery.data.limit}
          total={warehousesQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { WarehousesList };
