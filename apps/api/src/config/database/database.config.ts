import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Configuration data only — no connection is opened here and nothing under
// apps/api/prisma/ (schema, migrations, seed) is touched by this namespace.
// PrismaService (apps/api/src/database/, Phase 1.2D.2) reads from it via
// constructor injection (@Inject(databaseConfig.KEY)), not ConfigService.
export default registerAs('database', () => {
  const env = validateEnv();
  return {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
    poolMax: env.DATABASE_POOL_MAX,
    poolIdleTimeoutMs: env.DATABASE_POOL_IDLE_TIMEOUT_MS,
    poolConnectionTimeoutMs: env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
  };
});
