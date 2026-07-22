import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Bootstrap-level settings main.ts reads directly (port, env, log level,
// CORS origins) — the one namespace logging/'s own comment cross-
// references as "not moved here" (see configuration.md §5's CORS/
// LOG_LEVEL placement note).
export default registerAs('app', () => {
  const env = validateEnv();
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    // Milestone 14 (Production Infrastructure) — CI/Docker-stamped
    // identity, consumed by the admin-only runtime metadata endpoint
    // (modules/admin/runtime.controller.ts). See env.validation.ts's own
    // comment for why these are supplied, not introspected.
    version: env.APP_VERSION,
    gitCommitSha: env.GIT_COMMIT_SHA,
  };
});
