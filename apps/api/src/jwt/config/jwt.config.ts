import { registerAs } from '@nestjs/config';
import { validateEnv } from '../../config/env.validation';

// Assembles the `jwt` namespace from the already-validated JWT_* fields
// (env.validation.ts, Phase 1.2D.6). Registered via
// ConfigModule.forFeature() in jwt.module.ts, not config.module.ts's
// forRoot() — this namespace is owned by and lives alongside the JWT
// module, not the (frozen) Configuration subsystem, the same reasoning
// apps/api/src/logging/config/logger-options.config.ts already
// established for `loggerOptions`. Not "auth" — apps/api/src/config/auth/
// remains a separate, still-unvalidated placeholder reserved for managed
// IdP settings (IDP_ISSUER_URL/IDP_CLIENT_ID/IDP_CLIENT_SECRET); JWT is
// its own concern with its own graduation path.
export default registerAs('jwt', () => {
  const env = validateEnv();
  return {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTokenTtl: env.JWT_ACCESS_TOKEN_TTL,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshTokenTtl: env.JWT_REFRESH_TOKEN_TTL,
  };
});
