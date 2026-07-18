import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { appConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Typed injection, not ConfigService.get('app.port'): the recommended
  // access pattern this phase adopts project-wide (see
  // docs/architecture/configuration.md "Typed access pattern") — full
  // compile-time shape checking, no magic strings, refactor-safe. Outside
  // a class constructor (no @Inject here), app.get() resolves the same
  // provider token directly.
  const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const { port, nodeEnv } = appCfg;

  // API prefix + URI versioning → every route resolves under /api/v1/...
  // (a controller only needs @Controller('widgets'); defaultVersion applies
  // globally, so no per-controller @Version() is needed until a route
  // actually diverges from v1).
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Phase 1.2B wires the real logic for each of these — this phase only
  // reserves where they attach in the bootstrap order (see
  // docs/architecture/backend.md "Startup flow"):
  //   app.enableCors({ origin: appCfg.corsAllowedOrigins })
  //   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  //   app.useGlobalFilters(new AllExceptionsFilter())       // RFC 9457 shape, CONTRIBUTING.md §14
  //   app.useGlobalInterceptors(new TraceIdInterceptor())   // trace_id propagation, CONTRIBUTING.md §15

  // TLS terminates upstream (CDN / managed-container load balancer, per
  // docs/architecture/architecture.md) — never in this process. "HTTPS-ready"
  // here means trusting the edge's forwarded headers in production, not
  // passing httpsOptions into NestFactory.create for a TLS termination point
  // that doesn't exist in this deploy topology.
  if (nodeEnv === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Graceful shutdown: listens for SIGTERM/SIGINT and runs
  // OnModuleDestroy/OnApplicationShutdown lifecycle hooks before the process
  // exits — required for managed-container rolling deploys to drain
  // in-flight requests instead of dropping them.
  app.enableShutdownHooks();

  await app.listen(port);

  new Logger('Bootstrap').log(
    `Antrique API listening on port ${port} (prefix: /api/v1, env: ${nodeEnv})`,
  );
}

// Guarantees a deterministic non-zero exit for any error inside the async
// portion of bootstrap() (e.g. app.listen() failing), instead of an
// unhandled-promise-rejection warning. NOTE, confirmed by live testing:
// this does NOT catch ConfigModule's env-validation failures — those throw
// synchronously while config.module.ts's `@Module()` decorator is being
// evaluated at require()-time, before this file's own top-level code (this
// call included) runs at all. That path is already fail-fast on its own —
// Nest's internal bootstrap error handling logs a clean formatted message,
// then Node's default uncaught-exception handler exits the process — see
// docs/architecture/validation.md §3 for the real captured output.
bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
