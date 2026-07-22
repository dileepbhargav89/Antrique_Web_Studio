import { registerAs } from '@nestjs/config';
import { validateEnv } from '../../config/env.validation';
import type { LoggerOptions } from '../types/logger-options.type';

// Assembles LoggerOptions (../types/logger-options.type.ts) from the two
// already-validated source values — LOG_LEVEL (owned by
// config/app/app.config.ts's `logLevel`, not relocated — see
// docs/architecture/configuration.md §5) and LOG_FORMAT (owned by
// config/logging/logging.config.ts's `format`). No new env var, no
// re-validation — reads the same validateEnv() output every other domain
// reads. Registered via ConfigModule.forFeature() in logging.module.ts,
// not config.module.ts's forRoot() — this namespace is owned by and lives
// alongside the Logging module, not the (frozen) Configuration subsystem.
// Not consumed anywhere yet; Phase 1.2C.3's concrete Logger implementation
// is the first real consumer.
export default registerAs('loggerOptions', (): LoggerOptions => {
  const env = validateEnv();
  return {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  };
});
