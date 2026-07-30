'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { normalizeError } from '@/lib/errors/normalize-error';

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Marketing route error boundary caught:', normalizeError(error));
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-(--space-section-y) sm:py-(--space-section-y-lg)">
      <ErrorState onRetry={reset} />
    </div>
  );
}
