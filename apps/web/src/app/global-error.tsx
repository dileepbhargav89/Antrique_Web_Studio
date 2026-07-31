'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { normalizeError } from '@/lib/errors/normalize-error';

/**
 * Only fires for errors in the ROOT layout itself (rare) — it must render
 * its own <html>/<body> since the root layout that would normally provide
 * them is what crashed. Everything else is caught by app/error.tsx.
 *
 * Deliberately stays plain HTML/inline styles rather than importing
 * `components/ui/error-state.tsx` — this is the true last-resort fallback,
 * rendered precisely when something in the app's own component/provider
 * tree already failed; the fewer modules it depends on, the fewer ways it
 * can itself fail to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', normalizeError(error));
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <p>Please refresh the page.</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
