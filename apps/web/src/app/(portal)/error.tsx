'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';

/** Renders inside `PortalShell`'s `<main>` — the sidebar/header stay mounted around it
 * (Next.js error boundaries wrap a segment's content, not its own layout). Copy varies by
 * error kind/status (`lib/errors/error-copy.ts`) instead of one generic message regardless
 * of what actually threw. */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const normalized = normalizeError(error);

  useEffect(() => {
    console.error('Portal route error boundary caught:', normalized);
    // normalizeError() is pure/deterministic over `error` — re-running it per render
    // isn't worth memoizing, but re-logging on every `error` identity change is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const { title, description } = getErrorCopy(normalized);

  return <ErrorState title={title} description={description} onRetry={reset} />;
}
