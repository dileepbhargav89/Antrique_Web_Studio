import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Data only — no queue client/worker is constructed here. Same REDIS_URL
// as cache/ (one Redis instance, two distinct config concerns — see
// configuration.md's cache/queue split rationale); validated exactly
// once in env.validation.ts, read by both namespaces.
export default registerAs('queue', () => {
  const env = validateEnv();
  return {
    redisUrl: env.REDIS_URL,
  };
});
