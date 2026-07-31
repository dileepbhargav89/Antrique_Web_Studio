import * as Sentry from '@sentry/nextjs';

// Next.js's own client-instrumentation convention (stable since Next
// 15.3) — this file runs in the browser before the app hydrates. Content
// lives directly here, not in a separate sentry.client.config.ts —
// confirmed via a real `next build`: Sentry's own SDK emits a deprecation
// warning for the split-file form ("`sentry.client.config.ts` will no
// longer work" under Turbopack), so this follows its current guidance
// directly rather than carrying a warning forward.
//
// Reads `process.env.NEXT_PUBLIC_SENTRY_DSN` directly (not through
// `config/env.ts`'s `clientEnv`) — Sentry init stays decoupled from the
// rest of this app's own env validation, so neither can block the other.
//
// `tracesSampleRate: 0` — error tracking only, no performance
// tracing/session replay. This app has no APM backend wired up anywhere
// else (see apps/api's own equivalent reasoning in
// docs/architecture/operations.md) — adding client-side tracing without
// server-side tracing to correlate against would be a second,
// uncorrelated signal, not a complete picture.
//
// A missing/undefined `dsn` (NEXT_PUBLIC_SENTRY_DSN unset — the default
// in local dev) makes the SDK a documented no-op.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});

// Required by the SDK to instrument client-side route transitions (App
// Router navigations) — confirmed via a real `next build`, which fails
// this exact "ACTION REQUIRED" warning without it. Harmless alongside
// `tracesSampleRate: 0` above: with tracing off, this hook has nothing to
// actually send, it just satisfies the SDK's own instrumentation wiring.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
