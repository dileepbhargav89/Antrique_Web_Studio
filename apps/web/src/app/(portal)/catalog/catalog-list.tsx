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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/features/catalog/hooks/use-categories';
import { useCollections } from '@/features/catalog/hooks/use-collections';
import { useProducts } from '@/features/catalog/hooks/use-products';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import type { CatalogSortField, Product, ProductStatus } from '@/types/api/catalog';
import type { SortDirection } from '@/types/api/common';

const STATUS_TONE: Record<ProductStatus, StatusTone> = {
  DRAFT: 'muted',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
};

/** Radix `SelectItem` can't take value="" — this sentinel means "no filter applied". */
const ALL = '__all__';

interface SortOption {
  value: string;
  label: string;
  sortBy: CatalogSortField;
  sortDirection: SortDirection;
}

/**
 * `DataGrid`'s built-in header-click sort (`components/ui/data-grid.tsx`) re-sorts only
 * the already-fetched page client-side — it would silently contradict a server-driven
 * sort across pages. Every column here sets `enableSorting: false`; this explicit control
 * is the one thing that actually calls the API with a new `sortBy`/`sortDirection`.
 */
const SORT_OPTIONS: SortOption[] = [
  { value: 'sortOrder-asc', label: 'Sort order', sortBy: 'sortOrder', sortDirection: 'asc' },
  { value: 'name-asc', label: 'Name (A–Z)', sortBy: 'name', sortDirection: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', sortBy: 'name', sortDirection: 'desc' },
  { value: 'createdAt-desc', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'createdAt-asc', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
];

function CatalogList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'sortOrder',
    defaultSortDirection: 'asc',
    filterKeys: ['categoryId', 'collectionId', 'status'],
  });

  const categoriesQuery = useCategories({
    limit: 100,
    status: 'ACTIVE',
    sortBy: 'name',
    sortDirection: 'asc',
  });
  const collectionsQuery = useCollections({
    limit: 100,
    status: 'ACTIVE',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  const productsQuery = useProducts({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    categoryId: params.filters.categoryId,
    collectionId: params.filters.collectionId,
    status: params.filters.status as ProductStatus | undefined,
    sortBy: params.sortBy as CatalogSortField | undefined,
    sortDirection: params.sortDirection,
  });

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categoriesQuery.data?.items ?? []) map.set(category.id, category.name);
    return map;
  }, [categoriesQuery.data]);

  const collectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const collection of collectionsQuery.data?.items ?? []) {
      map.set(collection.id, collection.name);
    }
    return map;
  }, [collectionsQuery.data]);

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.catalog}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.categoryId ? (categoryNameById.get(row.original.categoryId) ?? '—') : '—',
      },
      {
        id: 'collection',
        header: 'Collection',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.collectionId
            ? (collectionNameById.get(row.original.collectionId) ?? '—')
            : '—',
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
        accessorKey: 'updatedAt',
        header: 'Updated',
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
    ],
    [categoryNameById, collectionNameById],
  );

  const hasActiveFilters = Boolean(
    params.search ||
    params.filters.categoryId ||
    params.filters.collectionId ||
    params.filters.status,
  );

  const sortValue = `${params.sortBy}-${params.sortDirection}`;

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        title="Catalog"
        subtitle="Browse published products, categories, and collections."
      />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search products..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <Select
              value={params.filters.categoryId ?? ALL}
              onValueChange={(value) =>
                setParams({ filters: { categoryId: value === ALL ? undefined : value } })
              }
            >
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {(categoriesQuery.data?.items ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={params.filters.collectionId ?? ALL}
              onValueChange={(value) =>
                setParams({ filters: { collectionId: value === ALL ? undefined : value } })
              }
            >
              <SelectTrigger aria-label="Filter by collection">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All collections</SelectItem>
                {(collectionsQuery.data?.items ?? []).map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                if (option) {
                  setParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
                }
              }}
            >
              <SelectTrigger aria-label="Sort products">
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
        data={productsQuery.data?.items}
        isLoading={productsQuery.isLoading}
        error={productsQuery.error}
        onRetry={() => productsQuery.refetch()}
        emptyMessage="No products found."
      />
      {productsQuery.data ? (
        <ListPagination
          page={productsQuery.data.page}
          limit={productsQuery.data.limit}
          total={productsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { CatalogList };
