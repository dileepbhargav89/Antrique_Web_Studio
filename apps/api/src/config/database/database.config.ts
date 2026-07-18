import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Configuration data only — no connection is opened here and nothing under
// apps/api/prisma/ (schema, migrations, seed) is touched by this namespace.
// PrismaModule/PrismaService (Phase 1.2B) will read from it via ConfigService.
export default registerAs('database', () => {
  const env = validateEnv();
  return {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
  };
});
