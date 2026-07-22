import { registerAs } from '@nestjs/config';
import { validateEnv } from '../../config/env.validation';

// Assembles the `hash` namespace from the already-validated HASH_* fields
// (env.validation.ts, Phase 1.2D.7). Registered via ConfigModule.forFeature()
// in password.module.ts, not config.module.ts's forRoot() — this namespace is
// owned by and lives alongside the Password module, not the (frozen)
// Configuration subsystem, the same reasoning apps/api/src/jwt/config/jwt.config.ts
// (itself mirroring logging/config/logger-options.config.ts) already
// established. Named `hash`, not `password`: this is Argon2 algorithm tuning,
// not password business policy (e.g. minimum length, reuse rules) — that's a
// distinct, still-unbuilt concern.
export default registerAs('hash', () => {
  const env = validateEnv();
  return {
    memoryCost: env.HASH_MEMORY_COST,
    timeCost: env.HASH_TIME_COST,
    parallelism: env.HASH_PARALLELISM,
  };
});
