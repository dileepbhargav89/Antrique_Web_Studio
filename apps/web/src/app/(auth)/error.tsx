'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const normalized = normalizeError(error);

  useEffect(() => {
    console.error('Auth route error boundary caught:', normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const { title, description } = getErrorCopy(normalized);

  return <ErrorState title={title} description={description} onRetry={reset} />;
}
