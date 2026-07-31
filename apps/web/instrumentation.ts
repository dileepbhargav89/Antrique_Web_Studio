import * as Sentry from '@sentry/nextjs';

// Next.js's own instrumentation hook (stable since Next 14.1, no
// `experimental.instrumentationHook` flag needed on this app's Next 15) —
// register() runs once per server process/edge worker startup, before
// any request is handled. `NEXT_RUNTIME` distinguishes the two server
// runtimes this app actually has (Node.js for Server Components/Route
// Handlers, Edge for middleware.ts) — each needs its own Sentry.init()
// call (see each config file's own header comment for why they can't
// share one).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Required by the SDK to capture errors thrown inside nested React
// Server Components — confirmed via a real `next build`, which logs a
// config warning without this exported. `error.tsx`/`global-error.tsx`
// (client-side boundaries) already call `Sentry.captureException`
// directly; this is the equivalent hook for the server-rendering path
// those two files never see.
export const onRequestError = Sentry.captureRequestError;
