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
import { useInvoices } from '@/features/billing/hooks/use-invoices';
import { ROUTES } from '@/config/routes';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { BillingNav } from '../billing-nav';
import type { Invoice, InvoiceSortField, InvoiceStatus } from '@/types/api/billing';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  DRAFT: 'muted',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'destructive',
  VOID: 'muted',
};

interface SortOption {
  value: string;
  label: string;
  sortBy: InvoiceSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'dueDate-asc', label: 'Due date (soonest)', sortBy: 'dueDate', sortDirection: 'asc' },
  {
    value: 'totalAmount-desc',
    label: 'Total (high to low)',
    sortBy: 'totalAmount',
    sortDirection: 'desc',
  },
];

function InvoicesList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const invoicesQuery = useInvoices({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as InvoiceStatus | undefined,
    sortBy: params.sortBy as InvoiceSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice #',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.billingInvoices}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.invoiceNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        enableSorting: false,
        cell: ({ row }) => formatCurrency(Number(row.original.totalAmount) || 0),
      },
      {
        accessorKey: 'outstandingBalance',
        header: 'Outstanding',
        enableSorting: false,
        cell: ({ row }) => formatCurrency(Number(row.original.outstandingBalance) || 0),
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
        accessorKey: 'dueDate',
        header: 'Due',
        enableSorting: false,
        cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : '—'),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);
  const sortValue = `${params.sortBy}-${params.sortDirection}`;

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Invoices" subtitle="Billing and outstanding balances." />
      <BillingNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search by invoice number..."
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
              <SelectTrigger aria-label="Sort invoices">
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
        data={invoicesQuery.data?.items}
        isLoading={invoicesQuery.isLoading}
        error={invoicesQuery.error}
        onRetry={() => invoicesQuery.refetch()}
        emptyMessage="No invoices found."
      />
      {invoicesQuery.data ? (
        <ListPagination
          page={invoicesQuery.data.page}
          limit={invoicesQuery.data.limit}
          total={invoicesQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { InvoicesList };
