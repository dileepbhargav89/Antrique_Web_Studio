import * as Sentry from '@sentry/node';
import { EnvVars } from '../config/env.validation';

// Phase 10, Module 8 revisit — the first real Sentry consumer.
// `config/monitoring/README.md` previously documented Sentry as "a
// placeholder... no APM/tracing backend is configured in any environment
// this app deploys to" (Module 5's own audit finding); now provisioning a
// real Sentry project makes that no longer true, so this closes it.
//
// Called directly from main.ts with `validateEnv()`'s own return value,
// not resolved via NestJS DI — Sentry needs to be initialized as early as
// possible (ideally before anything else can throw), and DI isn't
// available yet at that point in bootstrap (see main.ts's own
// process-level crash-handler comment for the same constraint).
//
// `tracesSampleRate: 0` — error tracking only, deliberately no
// performance tracing/APM. This app has no OpenTelemetry instrumentation
// (Module 5's own documented reasoning: a single-service monolith gets
// little value from spans beyond the already-real requestId/
// correlationId propagation) — turning on Sentry's own tracing without
// that context would just be a second, uncorrelated signal.
//
// A missing/undefined `dsn` (SENTRY_DSN unset — the default in local dev)
// makes Sentry's own SDK a no-op: `Sentry.captureException()` calls
// elsewhere in this app become harmless no-ops rather than requiring a
// conditional "is Sentry configured?" check at every call site.
export function initSentry(env: Pick<EnvVars, 'SENTRY_DSN' | 'NODE_ENV' | 'APP_VERSION'>): void {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.APP_VERSION,
    tracesSampleRate: 0,
  });
}
