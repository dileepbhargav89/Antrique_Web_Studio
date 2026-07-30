import type { NormalizedError } from '@/types/errors';

export interface ErrorCopy {
  title: string;
  description: string;
}

/**
 * Maps a `NormalizedError` (`lib/errors/normalize-error.ts`) to display copy — distinct
 * text for the cases route-level error boundaries actually need to tell apart, instead of
 * one generic "Something went wrong" regardless of what threw. Consumed by
 * `app/(portal)/error.tsx` and `app/(auth)/error.tsx`.
 *
 * 403 has no real trigger yet (no permission-based business logic exists) — this is
 * groundwork so a future permission-gated module can render a correct "Forbidden" state
 * without this file changing, not a feature being added early.
 */
export function getErrorCopy(error: NormalizedError): ErrorCopy {
  if (error.kind === 'network') {
    return {
      title: 'Unable to reach the server',
      description: 'Check your connection and try again.',
    };
  }

  if (error.kind === 'api') {
    if (error.statusCode === 401) {
      return {
        title: 'Your session has expired',
        description: 'Please log in again to continue.',
      };
    }
    if (error.statusCode === 403) {
      return {
        title: "You don't have access to this",
        description: 'If you think this is a mistake, contact your administrator.',
      };
    }
    if (error.statusCode === 404) {
      return {
        title: 'Not found',
        description: "The page or resource you're looking for doesn't exist.",
      };
    }
    if (error.statusCode >= 500) {
      return {
        title: 'Something went wrong on our end',
        description: 'Please try again in a moment.',
      };
    }
  }

  return {
    title: 'Something went wrong',
    description: 'Please try again, or come back later.',
  };
}
