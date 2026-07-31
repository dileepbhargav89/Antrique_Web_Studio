import * as Sentry from '@sentry/nextjs';

// Phase 10, Module 8 revisit — loaded by instrumentation.ts's register()
// for the Node.js runtime (Server Components, Route Handlers, `next
// start`'s own server process). Reads `process.env.SENTRY_DSN` directly
// (not through `config/env.server.ts`'s `serverEnv`) — same reasoning as
// sentry.client.config.ts: Sentry init stays decoupled from this app's
// own env validation. See that file's own comment for the
// `tracesSampleRate: 0` / "missing DSN is a safe no-op" reasoning, both
// identical here.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});
