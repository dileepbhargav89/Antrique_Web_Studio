import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Cross-cutting security policy (rate limiting today) — distinct from
// auth/ (identity/session config), which stays a placeholder until
// Auth integration is built.
export default registerAs('security', () => {
  const env = validateEnv();
  return {
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
  };
});
