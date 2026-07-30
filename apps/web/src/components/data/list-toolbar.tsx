'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';

export interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Per-module filter `Select`s, rendered inline after the search input. */
  filters?: ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

/**
 * Search + per-module filter slot + "Clear filters" — shared across every module's list
 * page. The search input debounces locally (300ms) before calling `onSearchChange` so
 * typing doesn't refetch on every keystroke; `use-list-params.ts` owns the URL state.
 */
function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  hasActiveFilters,
  onClearFilters,
}: ListToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (localSearch === search) return;
    const timeout = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={localSearch}
        onChange={(event) => setLocalSearch(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Search"
        className="sm:max-w-xs"
      />
      {filters}
      {hasActiveFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export { ListToolbar };
