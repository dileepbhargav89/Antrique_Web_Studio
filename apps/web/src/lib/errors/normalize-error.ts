import { ApiError } from '@/services/api/http-error';
import type { NormalizedError } from '@/types/errors';

/**
 * Classifies any caught value into one of three buckets so UI code (the
 * error boundary, a query's `onError`) can branch on `kind` instead of
 * re-deriving "is this an API error, a fetch failure, or something else
 * entirely" at every call site.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return { kind: 'api', statusCode: error.statusCode, message: error.message, body: error.body };
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return { kind: 'network', message: 'Unable to reach the server. Check your connection.' };
  }

  return {
    kind: 'unexpected',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    cause: error,
  };
}
