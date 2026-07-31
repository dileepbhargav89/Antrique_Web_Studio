import * as Sentry from '@sentry/nextjs';

// Phase 10, Module 8 revisit — loaded by instrumentation.ts's register()
// for the Edge runtime (middleware.ts runs here — this app has a real
// one, src/middleware.ts). A separate config file from
// sentry.server.config.ts because the Edge runtime is a distinct,
// more restricted JS environment (no Node.js APIs) — Sentry's own SDK
// requires initializing it separately even though the `Sentry.init()`
// call itself looks identical. See sentry.client.config.ts's own comment
// for the `tracesSampleRate: 0` / "missing DSN is a safe no-op" reasoning.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});
