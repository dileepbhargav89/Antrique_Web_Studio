import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Phase 10, Module 6 (Monitoring) — the first real content this domain
// ever gets (see this folder's own README, previously just a placeholder
// scoped to Sentry/OTel, still unbuilt — see logging/README.md's "Future
// extension points"). `token` stays `string | undefined` — enforcing
// "must be set in production" is env.validation.ts's own superRefine
// job, not this factory's; `MetricsController` reads whatever value is
// here and treats an unset token as "no auth required" (only reachable
// in practice outside production, since that combination fails startup
// validation otherwise).
export default registerAs('monitoring', () => {
  const env = validateEnv();
  return {
    metricsEnabled: env.METRICS_ENABLED,
    metricsToken: env.METRICS_TOKEN,
    sentryDsn: env.SENTRY_DSN,
    appVersion: env.APP_VERSION,
    nodeEnv: env.NODE_ENV,
  };
});
