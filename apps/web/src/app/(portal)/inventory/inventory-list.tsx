'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
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
import { useInventoryItems } from '@/features/inventory/hooks/use-inventory-items';
import { useWarehouses } from '@/features/inventory/hooks/use-warehouses';
import {
  deriveStockLevel,
  STOCK_LEVEL_LABEL,
  type StockLevel,
} from '@/features/inventory/stock-level';
import { InventoryNav } from './inventory-nav';
import type { InventoryItem } from '@/types/api/inventory';

const STOCK_LEVEL_TONE: Record<StockLevel, StatusTone> = {
  'out-of-stock': 'destructive',
  'low-stock': 'warning',
  'in-stock': 'success',
};

const ALL = '__all__';

function InventoryList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['warehouseId'],
  });

  const warehousesQuery = useWarehouses({ limit: 100, status: 'ACTIVE', sortBy: 'name' });

  const itemsQuery = useInventoryItems({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    warehouseId: params.filters.warehouseId,
    sortBy: params.sortBy as 'createdAt' | 'onHand' | undefined,
    sortDirection: params.sortDirection,
  });

  const warehouseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const warehouse of warehousesQuery.data?.items ?? [])
      map.set(warehouse.id, warehouse.name);
    return map;
  }, [warehousesQuery.data]);

  const columns = useMemo<ColumnDef<InventoryItem, unknown>[]>(
    () => [
      {
        id: 'warehouse',
        header: 'Warehouse',
        enableSorting: false,
        cell: ({ row }) => warehouseNameById.get(row.original.warehouseId) ?? '—',
      },
      {
        id: 'item',
        header: 'Item',
        enableSorting: false,
        // No reverse "variant/fabric → name" lookup endpoint exists in Backend v1.0 (same
        // gap as Orders' line items) — the raw id is shown rather than a fabricated name.
        cell: ({ row }) => {
          const item = row.original;
          if (item.productVariantId) {
            return (
              <span className="font-mono text-xs" title={item.productVariantId}>
                Variant {item.productVariantId.slice(0, 8)}…
              </span>
            );
          }
          if (item.fabricId) {
            return (
              <span className="font-mono text-xs" title={item.fabricId}>
                Fabric {item.fabricId.slice(0, 8)}…
              </span>
            );
          }
          return '—';
        },
      },
      {
        accessorKey: 'onHand',
        header: 'On hand',
        enableSorting: false,
      },
      {
        accessorKey: 'reserved',
        header: 'Reserved',
        enableSorting: false,
      },
      {
        accessorKey: 'available',
        header: 'Available',
        enableSorting: false,
      },
      {
        id: 'stockLevel',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const level = deriveStockLevel(row.original);
          return <StatusBadge label={STOCK_LEVEL_LABEL[level]} tone={STOCK_LEVEL_TONE[level]} />;
        },
      },
    ],
    [warehouseNameById],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.warehouseId);
  const sortValue = `${params.sortBy}-${params.sortDirection}`;

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Inventory" subtitle="Stock levels across every warehouse." />
      <InventoryNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search by variant SKU or fabric name..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
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
            <Select
              value={sortValue}
              onValueChange={(value) => {
                const [sortBy, sortDirection] = value.split('-') as [
                  'createdAt' | 'onHand',
                  'asc' | 'desc',
                ];
                setParams({ sortBy, sortDirection });
              }}
            >
              <SelectTrigger aria-label="Sort inventory">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="onHand-desc">On hand (high to low)</SelectItem>
                <SelectItem value="onHand-asc">On hand (low to high)</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <ResourceTable
        columns={columns}
        data={itemsQuery.data?.items}
        isLoading={itemsQuery.isLoading}
        error={itemsQuery.error}
        onRetry={() => itemsQuery.refetch()}
        emptyMessage="No inventory items found."
      />
      {itemsQuery.data ? (
        <ListPagination
          page={itemsQuery.data.page}
          limit={itemsQuery.data.limit}
          total={itemsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { InventoryList };
