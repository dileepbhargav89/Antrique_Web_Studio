// Central configuration barrel — the one import path every application
// module should use for anything config-related. See
// docs/architecture/configuration.md "Conventions" for the rule this
// enforces: one domain = one folder = one namespace = one entry here.
//
// Recommended access pattern (see configuration.md "Typed access
// pattern"): `@Inject(xConfig.KEY) private config: ConfigType<typeof
// xConfig>` in any NestJS provider, or `app.get(xConfig.KEY)` outside DI
// (main.ts does this for `appConfig`). `ConfigService.get('x.key')`
// remains available as a secondary option for cases that genuinely need
// to read across namespaces dynamically.
export { ConfigModule } from './config.module';
export { default as appConfig } from './app/app.config';
export { default as databaseConfig } from './database/database.config';
export { default as securityConfig } from './security/security.config';
export { default as loggingConfig } from './logging/logging.config';
export { default as swaggerConfig } from './swagger/swagger.config';
export { default as healthConfig } from './health/health.config';
export { default as cacheConfig } from './cache/cache.config';
export { default as queueConfig } from './queue/queue.config';
export { default as emailConfig } from './email/email.config';
export { default as storageConfig } from './storage/storage.config';
export { default as aiConfig } from './ai/ai.config';
