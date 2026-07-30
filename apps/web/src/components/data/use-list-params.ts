'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface ListParams {
  page: number;
  limit: number;
  search: string;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, string>;
}

export interface ListParamsPatch {
  page?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, string | undefined>;
}

export interface UseListParamsOptions {
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortDirection?: 'asc' | 'desc';
  /** Every filter key this list page recognizes — read from the URL into `params.filters`. */
  filterKeys?: string[];
}

/**
 * Drives list-page state (page/limit/search/sort/filters) via URL search params — the one
 * implementation every module's list page shares, so a filtered/sorted/paginated view
 * survives a refresh or the back button and is shareable. Same underlying primitive
 * (`useSearchParams`/`useRouter`) already used in `app/(auth)/login/login-form.tsx`.
 */
function useListParams(options: UseListParamsOptions = {}) {
  const {
    defaultLimit = 20,
    defaultSortBy,
    defaultSortDirection = 'asc',
    filterKeys = [],
  } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const params: ListParams = useMemo(() => {
    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? String(defaultLimit));
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : defaultLimit,
      search: searchParams.get('search') ?? '',
      sortBy: searchParams.get('sortBy') ?? defaultSortBy,
      sortDirection: searchParams.get('sortDirection') === 'desc' ? 'desc' : defaultSortDirection,
      filters,
    };
    // `filterKeys` is a plain array literal at each call site (not memoized by the
    // caller) — depending on its contents, not its identity, avoids re-deriving `params`
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString, defaultLimit, defaultSortBy, defaultSortDirection, filterKeys.join(',')]);

  const setParams = useCallback(
    (patch: ListParamsPatch) => {
      const next = new URLSearchParams(searchParamsString);
      const isFilterChange =
        patch.search !== undefined ||
        patch.sortBy !== undefined ||
        patch.sortDirection !== undefined ||
        patch.filters !== undefined;

      if (patch.search !== undefined) {
        if (patch.search) next.set('search', patch.search);
        else next.delete('search');
      }
      if (patch.sortBy !== undefined) next.set('sortBy', patch.sortBy);
      if (patch.sortDirection !== undefined) next.set('sortDirection', patch.sortDirection);
      if (patch.filters) {
        for (const [key, value] of Object.entries(patch.filters)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
      }
      // A fresh filter/search/sort resets to page 1 — staying on a deep page that no
      // longer matches the new criteria would silently show a confusing empty page.
      if (patch.page !== undefined) {
        next.set('page', String(patch.page));
      } else if (isFilterChange) {
        next.set('page', '1');
      }

      // `replace`, not `push` — every filter/search/sort/page change would otherwise add a
      // browser-history entry, so Back would step through each incremental change one at a
      // time instead of leaving the list page entirely (found during the Phase 4 Engineering
      // Review). List state is still shareable/bookmarkable via the URL either way.
      router.replace(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParamsString],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  return { params, setParams, clearFilters };
}

export { useListParams };
