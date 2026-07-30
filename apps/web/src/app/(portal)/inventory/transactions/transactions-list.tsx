'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ResourceTable } from '@/components/data/resource-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListParams } from '@/components/data/use-list-params';
import { useInventoryTransactions } from '@/features/inventory/hooks/use-inventory-transactions';
import { useWarehouses } from '@/features/inventory/hooks/use-warehouses';
import { formatDateTime } from '@/utils/date';
import { InventoryNav } from '../inventory-nav';
import type { InventoryTransaction, InventoryTransactionType } from '@/types/api/inventory';

const ALL = '__all__';
const TRANSACTION_TYPES: InventoryTransactionType[] = [
  'RECEIPT',
  'ADJUSTMENT',
  'RESERVATION',
  'RELEASE',
  'CONSUMPTION',
];

function TransactionsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortDirection: 'desc',
    filterKeys: ['warehouseId', 'type', 'dateFrom', 'dateTo'],
  });

  const warehousesQuery = useWarehouses({ limit: 100, status: 'ACTIVE', sortBy: 'name' });

  const transactionsQuery = useInventoryTransactions({
    page: params.page,
    limit: params.limit,
    warehouseId: params.filters.warehouseId,
    type: params.filters.type as InventoryTransactionType | undefined,
    dateFrom: params.filters.dateFrom,
    dateTo: params.filters.dateTo,
    sortDirection: params.sortDirection,
  });

  const columns = useMemo<ColumnDef<InventoryTransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'type',
        header: 'Type',
        enableSorting: false,
      },
      {
        id: 'onHand',
        header: 'On hand Δ → after',
        enableSorting: false,
        cell: ({ row }) => `${row.original.onHandDelta} → ${row.original.onHandAfter}`,
      },
      {
        id: 'reserved',
        header: 'Reserved Δ → after',
        enableSorting: false,
        cell: ({ row }) => `${row.original.reservedDelta} → ${row.original.reservedAfter}`,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        enableSorting: false,
        cell: ({ row }) => row.original.reason ?? '—',
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

  const hasActiveFilters = Boolean(
    params.filters.warehouseId ||
    params.filters.type ||
    params.filters.dateFrom ||
    params.filters.dateTo,
  );

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        title="Inventory Transactions"
        subtitle="The append-only stock movement ledger."
      />
      <InventoryNav />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={params.filters.warehouseId ?? ALL}
          onValueChange={(value) =>
            setParams({ filters: { warehouseId: value === ALL ? undefined : value } })
          }
        >
          <SelectTrigger aria-label="Filter by warehouse">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All warehouses</SelectItem>
            {(warehousesQuery.data?.items ?? []).map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <EnumFilterSelect
          ariaLabel="Filter by transaction type"
          placeholder="Type"
          allLabel="All types"
          options={TRANSACTION_TYPES}
          value={params.filters.type}
          onChange={(value) => setParams({ filters: { type: value } })}
        />
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tx-date-from" className="text-muted-foreground text-xs">
            From
          </Label>
          <Input
            id="tx-date-from"
            type="date"
            className="w-auto"
            value={params.filters.dateFrom ?? ''}
            onChange={(event) =>
              setParams({ filters: { dateFrom: event.target.value || undefined } })
            }
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tx-date-to" className="text-muted-foreground text-xs">
            To
          </Label>
          <Input
            id="tx-date-to"
            type="date"
            className="w-auto"
            value={params.filters.dateTo ?? ''}
            onChange={(event) =>
              setParams({ filters: { dateTo: event.target.value || undefined } })
            }
          />
        </div>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <ResourceTable
        columns={columns}
        data={transactionsQuery.data?.items}
        isLoading={transactionsQuery.isLoading}
        error={transactionsQuery.error}
        onRetry={() => transactionsQuery.refetch()}
        emptyMessage="No transactions found."
      />
      {transactionsQuery.data ? (
        <ListPagination
          page={transactionsQuery.data.page}
          limit={transactionsQuery.data.limit}
          total={transactionsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { TransactionsList };
