'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorState } from '@/components/ui/error-state';
import { normalizeError } from '@/lib/errors/normalize-error';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', normalizeError(error));
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <ErrorState onRetry={reset} />
    </div>
  );
}
