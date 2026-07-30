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
import { useSuppliers } from '@/features/inventory/hooks/use-suppliers';
import { ROUTES } from '@/config/routes';
import { InventoryNav } from '../inventory-nav';
import type { Supplier, SupplierStatus } from '@/types/api/inventory';

const STATUS_TONE: Record<SupplierStatus, StatusTone> = {
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

function SuppliersList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'name',
    defaultSortDirection: 'asc',
    filterKeys: ['status'],
  });

  const suppliersQuery = useSuppliers({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as SupplierStatus | undefined,
    sortBy: params.sortBy as 'name' | 'createdAt' | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.inventorySuppliers}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'contactName',
        header: 'Contact',
        enableSorting: false,
        cell: ({ row }) => row.original.contactName ?? '—',
      },
      {
        accessorKey: 'contactEmail',
        header: 'Email',
        enableSorting: false,
        cell: ({ row }) => row.original.contactEmail ?? '—',
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
      <DetailPageHeader title="Suppliers" subtitle="Vendors supplying variants and fabrics." />
      <InventoryNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search suppliers..."
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
        data={suppliersQuery.data?.items}
        isLoading={suppliersQuery.isLoading}
        error={suppliersQuery.error}
        onRetry={() => suppliersQuery.refetch()}
        emptyMessage="No suppliers found."
      />
      {suppliersQuery.data ? (
        <ListPagination
          page={suppliersQuery.data.page}
          limit={suppliersQuery.data.limit}
          total={suppliersQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { SuppliersList };
