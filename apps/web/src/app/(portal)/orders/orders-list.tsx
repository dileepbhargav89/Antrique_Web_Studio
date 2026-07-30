'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ListPagination } from '@/components/data/list-pagination';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrders } from '@/features/orders/hooks/use-orders';
import { ROUTES } from '@/config/routes';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { Order, OrderSortField, OrderStatus } from '@/types/api/orders';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  DRAFT: 'muted',
  PENDING: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

interface SortOption {
  value: string;
  label: string;
  sortBy: OrderSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'total-desc', label: 'Total (high to low)', sortBy: 'total', sortDirection: 'desc' },
  { value: 'total-asc', label: 'Total (low to high)', sortBy: 'total', sortDirection: 'asc' },
];

function formatTotal(total: string): string {
  const amount = Number(total);
  return Number.isFinite(amount) ? formatCurrency(amount) : total;
}

function OrdersList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status', 'dateFrom', 'dateTo'],
  });

  const ordersQuery = useOrders({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as OrderStatus | undefined,
    dateFrom: params.filters.dateFrom,
    dateTo: params.filters.dateTo,
    sortBy: params.sortBy as OrderSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'Order',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.orders}/${row.original.id}`}
            className="font-mono text-xs font-medium hover:underline"
          >
            #{row.original.id.slice(0, 8)}
          </Link>
        ),
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
        accessorKey: 'total',
        header: 'Total',
        enableSorting: false,
        cell: ({ row }) => formatTotal(row.original.total),
      },
      {
        accessorKey: 'createdAt',
        header: 'Placed',
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(
    params.search || params.filters.status || params.filters.dateFrom || params.filters.dateTo,
  );

  const sortValue = `${params.sortBy}-${params.sortDirection}`;

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Orders" subtitle="Track and progress customer orders." />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search by customer name or email..."
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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="orders-date-from" className="text-muted-foreground text-xs">
                From
              </Label>
              <Input
                id="orders-date-from"
                type="date"
                className="w-auto"
                value={params.filters.dateFrom ?? ''}
                onChange={(event) =>
                  setParams({ filters: { dateFrom: event.target.value || undefined } })
                }
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="orders-date-to" className="text-muted-foreground text-xs">
                To
              </Label>
              <Input
                id="orders-date-to"
                type="date"
                className="w-auto"
                value={params.filters.dateTo ?? ''}
                onChange={(event) =>
                  setParams({ filters: { dateTo: event.target.value || undefined } })
                }
              />
            </div>
            <Select
              value={sortValue}
              onValueChange={(value) => {
                const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
                if (option) {
                  setParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
                }
              }}
            >
              <SelectTrigger aria-label="Sort orders">
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
        data={ordersQuery.data?.items}
        isLoading={ordersQuery.isLoading}
        error={ordersQuery.error}
        onRetry={() => ordersQuery.refetch()}
        emptyMessage="No orders found."
      />
      {ordersQuery.data ? (
        <ListPagination
          page={ordersQuery.data.page}
          limit={ordersQuery.data.limit}
          total={ordersQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { OrdersList };
