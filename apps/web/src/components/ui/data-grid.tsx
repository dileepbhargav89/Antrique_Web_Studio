'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

export interface DataGridProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyMessage?: string;
  className?: string;
}

/** Table + @tanstack/react-table for sort — the standard pairing. No pagination/filtering wired
 * here (out of scope for generic infrastructure); consumers pass pre-paginated/filtered `data`. */
function DataGrid<TData>({
  columns,
  data,
  emptyMessage = 'No results.',
  className,
}: DataGridProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return <EmptyState title={emptyMessage} className={className} />;
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                const ariaSort =
                  sortDirection === 'asc'
                    ? 'ascending'
                    : sortDirection === 'desc'
                      ? 'descending'
                      : canSort
                        ? 'none'
                        : undefined;
                return (
                  <TableHead key={header.id} aria-sort={ariaSort}>
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDirection === 'asc' ? (
                          <ArrowUpIcon aria-hidden="true" className="size-3.5" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ChevronsUpDownIcon
                            aria-hidden="true"
                            className="text-muted-foreground size-3.5"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataGrid };
export type { ColumnDef } from '@tanstack/react-table';
