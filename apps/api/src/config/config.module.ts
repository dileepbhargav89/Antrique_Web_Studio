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
