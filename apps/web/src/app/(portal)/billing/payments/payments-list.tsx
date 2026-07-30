'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import { Button } from '@/components/ui/button';
import { usePayments } from '@/features/billing/hooks/use-payments';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';
import { BillingNav } from '../billing-nav';
import type { Payment, PaymentStatus } from '@/types/api/billing';

const STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  PENDING: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'destructive',
  REFUNDED: 'muted',
};

function PaymentsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const paymentsQuery = usePayments({
    page: params.page,
    limit: params.limit,
    status: params.filters.status as PaymentStatus | undefined,
    sortBy: params.sortBy as 'createdAt' | 'amount' | 'status' | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'method',
        header: 'Method',
        enableSorting: false,
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        enableSorting: false,
        cell: ({ row }) => row.original.reference ?? '—',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        enableSorting: false,
        cell: ({ row }) => formatCurrency(Number(row.original.amount) || 0, row.original.currency),
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
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Payments" subtitle="Recorded payments against invoices." />
      <BillingNav />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <EnumFilterSelect
          ariaLabel="Filter by status"
          placeholder="Status"
          allLabel="All statuses"
          options={Object.keys(STATUS_TONE)}
          value={params.filters.status}
          onChange={(value) => setParams({ filters: { status: value } })}
        />
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="w-fit">
            Clear filters
          </Button>
        ) : null}
      </div>
      <ResourceTable
        columns={columns}
        data={paymentsQuery.data?.items}
        isLoading={paymentsQuery.isLoading}
        error={paymentsQuery.error}
        onRetry={() => paymentsQuery.refetch()}
        emptyMessage="No payments found."
      />
      {paymentsQuery.data ? (
        <ListPagination
          page={paymentsQuery.data.page}
          limit={paymentsQuery.data.limit}
          total={paymentsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { PaymentsList };
