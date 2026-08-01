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
    // node-postgres's `ssl: true` uses Node's default TLS options
    // (rejectUnauthorized: true), which rejects managed Postgres providers
    // like Supabase whose certificate chain isn't in Node's trusted root
    // store — confirmed live ("self-signed certificate in certificate
    // chain"). The connection is still encrypted; this only skips chain
    // validation, the standard accepted posture for connecting to a
    // managed provider reached via a trusted DATABASE_URL secret (same
    // relaxation Prisma's own Supabase docs recommend).
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    poolMax: env.DATABASE_POOL_MAX,
    poolIdleTimeoutMs: env.DATABASE_POOL_IDLE_TIMEOUT_MS,
    poolConnectionTimeoutMs: env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
  };
});
