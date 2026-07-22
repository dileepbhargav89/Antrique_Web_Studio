import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app/app.config';
import databaseConfig from './database/database.config';
import securityConfig from './security/security.config';
import loggingConfig from './logging/logging.config';
import swaggerConfig from './swagger/swagger.config';
import healthConfig from './health/health.config';
import cacheConfig from './cache/cache.config';
import queueConfig from './queue/queue.config';
import { validateEnv } from './env.validation';

// Milestone 14 (Production Infrastructure) — "Detect: duplicate
// configuration." Each entry here is a `registerAs(namespace, factory)`
// result; `registerAs` derives its DI token from `namespace`
// (`CONFIGURATION(namespace)`), so two factories registered under the same
// namespace string would silently collide — `@nestjs/config` keeps
// whichever loaded last, the other's `.KEY` would resolve to the WRONG
// values with no error anywhere. `registerAs` exposes the namespace it was
// given as `factory.KEY`'s own suffix, but not as a directly-readable
// string — cheaper and just as reliable to maintain the same list of
// names this module already hand-writes in `load` below, once, here, and
// assert it has no duplicate before `load` is ever used. Runs at module
// evaluation time (import time), so a duplicate aborts before
// NestFactory.create() runs at all — the same "fail before anything
// starts listening" property env.validation.ts's own checks have.
const CONFIG_NAMESPACES = [
  'app',
  'database',
  'security',
  'logging',
  'swagger',
  'health',
  'cache',
  'queue',
] as const;

function assertNoDuplicateConfigNamespaces(namespaces: readonly string[]): void {
  const seen = new Set<string>();
  for (const namespace of namespaces) {
    if (seen.has(namespace)) {
      throw new Error(
        `Duplicate configuration namespace "${namespace}" registered in ConfigModule — ` +
          'each registerAs() domain must have a unique name (see docs/architecture/configuration.md).',
      );
    }
    seen.add(namespace);
  }
}

assertNoDuplicateConfigNamespaces(CONFIG_NAMESPACES);

// @Global() so every future business module gets ConfigService via DI
// without re-importing this module — a single app-wide configuration
// source, per NestJS's own recommended pattern.
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        securityConfig,
        loggingConfig,
        swaggerConfig,
        healthConfig,
        cacheConfig,
        queueConfig,
      ],
      // Runs once at module init, before NestFactory.create() resolves —
      // throws synchronously on invalid env, which propagates out and
      // aborts startup. See env.validation.ts and
      // docs/architecture/validation.md "Configuration lifecycle".
      validate: validateEnv,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
