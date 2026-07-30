import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

export interface ListPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * `PaginationLink`/`PaginationPrevious`/`PaginationNext` (`components/ui/pagination.tsx`)
 * render real `<a href>` elements — appropriate for per-page routes, not this phase's
 * client-fetched lists. Reuses the structural `Pagination`/`PaginationContent`/
 * `PaginationItem` wrappers (nav/ul/li + aria-label) with plain `Button` onClick handlers
 * instead.
 */
function ListPagination({ page, limit, total, onPageChange }: ListPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span className="text-muted-foreground px-2 text-sm" aria-live="polite">
            Page {page} of {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Go to next page"
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export { ListPagination };
