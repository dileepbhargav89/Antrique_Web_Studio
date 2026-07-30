import { QueryCache, MutationCache, type DefaultOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/services/api/http-error';
import { normalizeError } from '@/lib/errors/normalize-error';

/** Never worth retrying — the server has already told us the request itself is bad. */
function isNonRetryableStatus(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Default `QueryClient` options, consumed by `providers/query-provider.tsx`'s
 * `makeQueryClient()`. Conventions this codifies (see `lib/query/README.md` for the full
 * writeup):
 * - Queries retry network/5xx failures up to twice; a 4xx `ApiError` never retries (the
 *   request itself is invalid — retrying won't change that).
 * - Mutations never retry automatically (`retry: 0`) — an automatic retry of a side
 *   effect risks a duplicate write; a mutation that should be retried does so explicitly
 *   (a user re-clicking "Save").
 * - `staleTime` (60s) matches the prior single-config default — unchanged.
 */
export const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && isNonRetryableStatus(error.statusCode)) {
        return false;
      }
      return failureCount < 2;
    },
  },
  mutations: {
    retry: 0,
  },
};

/**
 * Queries stay silent by default — the calling component owns error display via
 * `components/ui/error-state.tsx` (`useQuery`'s own `error`/`isError`). Mutations get a
 * global toast safety net here, since a failed mutation (a button click with no visible
 * result otherwise) is easy to miss without one; a component can still add its own
 * `onError` for anything more specific, which runs in addition to this, not instead of it.
 */
export function createQueryCache(): QueryCache {
  return new QueryCache();
}

export function createMutationCache(): MutationCache {
  return new MutationCache({
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.message);
    },
  });
}
