'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@/components/ui/data-grid';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';

export interface ResourceTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  /** Accepts `readonly` arrays — every `PaginatedResponse<T>.items` is readonly. */
  data: readonly TData[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  skeletonRows?: number;
}

/**
 * Wraps the existing `DataGrid` (`components/ui/data-grid.tsx`, Phase 0.5 — sort +
 * `aria-sort` already built in) with the loading/error states it deliberately doesn't
 * handle itself (`DataGrid`'s own doc comment: "no pagination/filtering wired here...
 * consumers pass pre-paginated/filtered data"). The one abstraction every module's list
 * page shares — a list page becomes a thin column-def, not a bespoke loading/error/empty
 * implementation repeated seven times.
 */
function ResourceTable<TData>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyMessage = 'No results.',
  skeletonRows = 6,
}: ResourceTableProps<TData>) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={onRetry} />;
  }

  return <DataGrid columns={columns} data={data ? [...data] : []} emptyMessage={emptyMessage} />;
}

export { ResourceTable };
