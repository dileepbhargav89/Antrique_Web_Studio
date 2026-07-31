import * as Sentry from '@sentry/node';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { appConfig, swaggerConfig } from './config';
import { validateEnv } from './config/env.validation';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { VALIDATION_PIPE_OPTIONS } from './common/pipes/validation-pipe.options';
import { applyApiRouting } from './bootstrap/api-routing';
import { buildSwaggerDocument } from './bootstrap/swagger-document';
import { LOGGER, Logger as AppLogger } from './logging';
import { initSentry } from './monitoring/sentry';

// Phase 10, Module 8 revisit — as early as physically possible in this
// process, before anything else below can throw. Uses `validateEnv()`
// directly (not DI — nothing is constructed yet, same constraint the
// crash handlers just below already accepted).
initSentry(validateEnv());

// Phase 10, Module 5 (Observability) — "process-level crash visibility."
// Confirmed absent by this module's own audit: nothing anywhere caught
// `uncaughtException`/`unhandledRejection` before this — the only
// process-level safety net was `bootstrap().catch()` at the bottom of
// this file, which covers only the async portion of bootstrap() itself
// (e.g. `app.listen()` failing), not anything thrown later from
// request-handling code OUTSIDE Nest's own exception-filter machinery
// (a raw `setTimeout`/fire-and-forget promise no Nest-managed code path
// ever awaits). Registered at module load — before `bootstrap()` even
// runs — for the widest possible coverage window, matching
// `bootstrap().catch()`'s own reasoning for using plain `console.error`
// rather than the app's structured `LOGGER`: this can fire before Nest's
// DI container exists at all, so there is no `LOGGER` to reach for yet.
// Both exit(1): an uncaught exception or unhandled rejection means the
// process reached a state nothing in its own code anticipated —
// continuing to serve requests from there risks silent data corruption
// or a slow, confusing failure mode far worse than a clean, logged
// restart (which a container orchestrator's own restart policy already
// exists to handle). This also makes behavior deterministic across Node
// versions for unhandled rejections specifically, rather than relying
// on whatever Node's own default (`--unhandled-rejections` mode) happens
// to be.
// Phase 10, Module 8 revisit — `Sentry.captureException()` is fire-and-
// forget (queues the event in-memory); without an explicit flush, a
// synchronous `process.exit()` right after would very plausibly kill the
// process before the SDK's own background HTTP send ever leaves the
// process, silently dropping exactly the event this exists to capture.
// `Sentry.close(2000)` waits (bounded to 2s) for any queued events to
// flush before resolving, `.finally()` so a Sentry-side failure
// (network down, etc.) still exits the process rather than hanging it.
process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error('uncaughtException', error);
  Sentry.captureException(error);
  void Sentry.close(2000).finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('unhandledRejection', reason);
  Sentry.captureException(reason);
  void Sentry.close(2000).finally(() => process.exit(1));
});

// Milestone 13 (Security Hardening) — "request size limits, JSON body
// limits." Every real DTO body in this API is a small business object
// (the largest — a multi-line order create — is still comfortably under
// 10KB); 256KB is generous headroom for that while staying far below a
// DoS-scale payload. A plain, unambiguous, always-parseable string
// literal — never a computed/env-configurable value — deliberately: the
// `body-parser` DoS this milestone's own dependency audit found
// (GHSA-v422-hmwv-36x6) is specifically about an INVALID `limit` value
// (an unparseable string, NaN) silently disabling size enforcement
// entirely; a fixed literal can never be invalid.
const REQUEST_BODY_LIMIT = '256kb';

async function bootstrap() {
  // Milestone 14 (Production Infrastructure) — "Startup logs." The first
  // line of output any deploy/boot log has, before ConfigModule's own
  // env-validation even runs (see this file's final `bootstrap().catch()`
  // comment for what happens if THAT fails) — deliberately a plain
  // `Logger`, not the app's own structured `LOGGER` (DI isn't available
  // yet; nothing has been constructed).
  new Logger('Bootstrap').log('Antrique API bootstrap starting...');

  // `bodyParser: false` — NestJS's own default (Express's `body-parser`
  // defaults, 100KB) is disabled here so the explicit, EXPLICIT
  // `REQUEST_BODY_LIMIT` below is what actually governs every request,
  // not a library default this app never chose and never documented.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: REQUEST_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

  // HTTP security headers (Milestone 13 — Security Hardening) —
  // registered first, ahead of every other middleware, so every
  // response (including an early 4xx from a later middleware) still
  // carries them. Helmet's own defaults already cover most of this
  // milestone's own named header list — HSTS, X-Frame-Options,
  // X-Content-Type-Options, X-DNS-Prefetch-Control, Referrer-Policy,
  // Cross-Origin-Opener-Policy — see docs/architecture/security.md
  // "Security Headers" for the full, verified-live table of what's
  // present and why. Two explicit overrides beyond the defaults:
  //   - `contentSecurityPolicy`: this API returns ONLY JSON, never HTML/
  //     scripts/styles/frames — `default-src 'none'`/`frame-ancestors
  //     'none'` is strictly tighter than Helmet's own browser-page-
  //     oriented default CSP (which allows 'self' scripts/styles,
  //     irrelevant to a response body that's never rendered as a page).
  //     `connectSrc: ["'self'"]` is required alongside this: Helmet
  //     merges its own defaults with these overrides, and unlike
  //     script-src/style-src/img-src, Helmet has no default `connect-src`
  //     — an unset one silently falls back to `default-src`, which would
  //     otherwise block Swagger UI's own "Try it out" fetch calls to this
  //     same origin (confirmed live — CSP violation in-browser, "Try it
  //     out" requests to /api/docs never leave the page without this).
  //   - `crossOriginResourcePolicy: 'same-origin'`: this API's own
  //     responses are never meant to be `fetch()`ed as a sub-resource by
  //     an unrelated origin's page (only via CORS-negotiated XHR/fetch
  //     calls, governed separately below) — tighter than Helmet's own
  //     default (`cross-origin`).
  // `crossOriginEmbedderPolicy` is deliberately left at Helmet's own
  // default (off) — enabling it requires every cross-origin resource
  // this app's own future frontend embeds to itself carry a matching
  // CORP header, a real coordination cost with no current benefit for a
  // pure JSON API that embeds nothing.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // Response compression (Milestone 12 — Performance Engineering) —
  // negotiates gzip/deflate via the request's own `Accept-Encoding`
  // header (confirmed live — a client sending none gets an uncompressed
  // response, unchanged from before); no size threshold override — the
  // package's own 1KB default already skips compressing the tiny
  // responses (single-row gets, 204s) where compression overhead would
  // exceed the saving.
  app.use(compression());

  // Typed injection, not ConfigService.get('app.port'): the recommended
  // access pattern this phase adopts project-wide (see
  // docs/architecture/configuration.md "Typed access pattern") — full
  // compile-time shape checking, no magic strings, refactor-safe. Outside
  // a class constructor (no @Inject here), app.get() resolves the same
  // provider token directly. Resolved here (earlier than every prior
  // milestone needed it) because CORS, immediately below, needs
  // `corsAllowedOrigins`.
  const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const { port, nodeEnv, corsAllowedOrigins, version } = appCfg;

  // CORS (Milestone 13 — Security Hardening) — wires up the
  // ALREADY-VALIDATED, previously-unused `CORS_ALLOWED_ORIGINS`
  // (`env.validation.ts`, validated since Phase 1.2B, genuinely consumed
  // for the first time here). An explicit ALLOWLIST, never a wildcard —
  // `corsAllowedOrigins` is a plain string array (possibly empty, if
  // unset); passing it directly to `origin` means "reflect the request's
  // Origin header only when it exactly matches one of these," and an
  // EMPTY array means no cross-origin browser request is ever allowed
  // (confirmed live) — a safe, deny-by-default outcome for a deployment
  // that hasn't configured any allowed origin yet, not an accidental
  // wildcard. `methods` is the exact set this API actually exposes
  // (confirmed via a repo-wide sweep — no route anywhere uses `PUT`).
  // `credentials: false` — this API is Bearer-token-authenticated, never
  // cookie-based, so the CORS "credentials" mode (which governs
  // cookies/TLS client certs, NOT the `Authorization` header — that's
  // just a normal allowed header) has nothing to opt into yet;
  // `Authorization` itself is listed in `allowedHeaders` regardless.
  app.enableCors({
    origin: corsAllowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-Id',
      'X-Correlation-Id',
    ],
    credentials: false,
  });

  // Registered via raw app.use(), not NestModule.configure()/
  // MiddlewareConsumer — confirmed by direct testing that
  // `consumer.apply(...).forRoutes('*')` scopes middleware matching to
  // app.setGlobalPrefix()'s prefix (requests outside /api/v1/*, e.g. a
  // future unprefixed /health endpoint, silently never reached it).
  // app.use() at the Express/HTTP-adapter level runs for every request
  // regardless of the Nest-level prefix, which is what "log every
  // completed request" actually requires. HttpLoggingMiddleware is listed
  // in app.module.ts's `providers` purely so app.get() can resolve a real
  // instance (with LOGGER/RequestContextService injected) here.
  const httpLoggingMiddleware = app.get(HttpLoggingMiddleware);
  app.use(httpLoggingMiddleware.use.bind(httpLoggingMiddleware));

  // API prefix + URI versioning → every route resolves under /api/v1/...
  // (a controller only needs @Controller('widgets'); defaultVersion applies
  // globally, so no per-controller @Version() is needed until a route
  // actually diverges from v1). `HealthController`'s routes are excluded
  // from both (see bootstrap/api-routing.ts's own comment).
  //
  // Engineering polish pass (pre-Backend-v1.0-review) — extracted to
  // bootstrap/api-routing.ts so scripts/generate-openapi.ts (the CI
  // OpenAPI-artifact generator) applies the identical topology without
  // re-declaring it — see that file's own header comment.
  applyApiRouting(app);

  // OpenAPI / Swagger (Milestone 14 — Production Infrastructure) — gated
  // behind `swaggerCfg.enabled`, itself gated by env.validation.ts's own
  // production-safety check (SWAGGER_ENABLED can only be true in
  // production when SWAGGER_ALLOW_IN_PRODUCTION is ALSO explicitly true —
  // see that file's own comment): by the time this line runs, a `true`
  // here has already been confirmed deliberate, not a copied-over dev
  // default. DTO/response schemas come from the `@nestjs/swagger` CLI
  // plugin (nest-cli.json — introspects class-validator decorators and
  // TypeScript types at compile time), not hand-written `@ApiProperty()`
  // annotations on every field — see docs/architecture/deployment.md
  // "API documentation" for what that plugin covers and what it doesn't.
  //
  // Engineering polish pass — the DocumentBuilder config itself (title/
  // description/bearer-auth scheme) now lives in
  // bootstrap/swagger-document.ts, the one place both this live-served
  // copy and the CI-generated `openapi.json` artifact (scripts/
  // generate-openapi.ts) build their document from — see that task's own
  // "Do not duplicate Swagger configuration" instruction and
  // docs/architecture/deployment.md "OpenAPI artifact generation."
  const swaggerCfg = app.get<ConfigType<typeof swaggerConfig>>(swaggerConfig.KEY);
  if (swaggerCfg.enabled) {
    const swaggerDocument = buildSwaggerDocument(app, version);
    SwaggerModule.setup(swaggerCfg.path.replace(/^\//, ''), app, swaggerDocument);
  }

  // Request validation is now real (Phase 1.2D.5) — global, no
  // per-controller/per-route @UsePipes() anywhere, including
  // apps/api/src/modules/auth/. ValidationPipe needs no injected
  // dependencies, unlike ExceptionLoggingFilter below, so
  // app.useGlobalPipes() here is simpler than an APP_PIPE provider for
  // no loss of capability. Options:
  // apps/api/src/common/pipes/validation-pipe.options.ts.
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  // Exception LOGGING is now real (Phase 1.2C.6) — ExceptionLoggingFilter,
  // registered via APP_FILTER in app.module.ts, not here (no app.get()/
  // app.use() workaround needed for exception filters — unlike
  // HttpLoggingMiddleware above, filters aren't route-matched, so there's
  // no MiddlewareConsumer-style prefix-scoping risk). It already logs and
  // preserves Nest's default response shape for the BadRequestException
  // ValidationPipe throws on invalid input, the same as any other
  // HttpException — no extra wiring needed there either. It does NOT
  // reshape responses into RFC 9457 Problem Details — that's still
  // separate, unscheduled work, along with the rest of this list, which
  // this phase only reserves where it attaches in the bootstrap order
  // (see docs/architecture/backend.md "Startup flow"):
  //   <RFC 9457 response-shaping filter>                    // CONTRIBUTING.md §14
  //   app.useGlobalInterceptors(new TraceIdInterceptor())   // trace_id propagation, CONTRIBUTING.md §15
  //
  // CORS is no longer on this reserved list — wired up above (Milestone
  // 13 — Security Hardening).
  //
  // ETag generation + conditional-GET (304) handling are NOT on this
  // list — confirmed LIVE (Milestone 12 — Performance Engineering) that
  // Express's own default behavior already does both: every JSON
  // response gets a weak ETag, and a request sent with a matching
  // `If-None-Match` already gets a `304 Not Modified` with an empty
  // body, with zero code in this app. Nothing to add here.

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
  //
  // Milestone 14 (Production Infrastructure) — "Shutdown logs." Explicit
  // `process.on()` listeners here are ADDITIVE to `enableShutdownHooks()`'s
  // own internal SIGTERM/SIGINT handling below (Node supports multiple
  // listeners per signal; this one only logs, it never calls `app.close()`
  // itself — that stays exclusively `enableShutdownHooks()`'s job, so
  // there is exactly one shutdown sequence, not two racing ones). Exists
  // purely so a deploy log shows the signal was received BEFORE the
  // OnModuleDestroy hooks' own log lines (e.g. PrismaService's "Database
  // connection closed") — otherwise a container orchestrator's own
  // "sent SIGTERM" event has nothing in this app's own log to correlate
  // against. See docs/architecture/runbook.md "Shutdown sequence" for the
  // full ordered list this produces end to end.
  //
  // Phase 10, Module 5 (Observability) — this and the final "listening"
  // line below now go through the app's own structured `LOGGER`
  // (resolvable here — `app` is fully constructed by this point, unlike
  // the very first "bootstrap starting..." line above main.ts's own
  // `bootstrap()`, which genuinely cannot: nothing has been constructed
  // yet). Previously both used `@nestjs/common`'s built-in `Logger` —
  // non-JSON, colorized output that bypassed `ConsoleLogTransport`/
  // `JsonLogFormatter` entirely, so log-aggregation tooling expecting
  // uniform JSON on stdout would see a handful of differently-shaped
  // lines at every process start/stop. Confirmed via this module's own
  // audit — a real, if minor, inconsistency, not a hypothetical one.
  const logger = app.get<AppLogger>(LOGGER);
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      logger.info(`${signal} received — starting graceful shutdown...`);
    });
  }
  app.enableShutdownHooks();

  await app.listen(port);

  logger.info(
    `Antrique API listening on port ${port} (prefix: /api/v1, env: ${nodeEnv}, version: ${version})`,
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
