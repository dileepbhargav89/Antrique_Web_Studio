import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import databaseConfig from '../config/database/database.config';
import { LOGGER, Logger } from '../logging';

// Milestone 12 (Performance Engineering) — "database duration"/"slow
// query logging." A query taking longer than this is unusual enough on
// this schema's own indexing (see docs/architecture/performance.md) to
// be worth a `warn`, not routine `debug` noise — 100ms is the same
// rough order-of-magnitude threshold this codebase's own
// SLOW_REQUEST_THRESHOLD_MS uses for a whole HTTP request (a single
// query being that slow is a stronger signal than the request overall
// being that slow, since a request is usually built from several
// queries).
const SLOW_QUERY_THRESHOLD_MS = 100;

// Prisma's generated `PrismaClient` is exported as BOTH a value (the
// runtime class from `getPrismaClientClass()`) and a separate generic
// TYPE alias (`PrismaClient<LogOpts, ...>`) with a different shape —
// `class PrismaService extends PrismaClient` binds to the VALUE's own
// (non-generic-friendly) constructor type, so `$on('query', ...)` below
// can't be typed through normal subclass inheritance no matter which
// type argument this class's own `extends` clause supplies. This
// minimal local interface describes exactly the one event shape this
// file actually consumes (Prisma's own documented `QueryEvent` fields),
// used only to type the `$on()` call site below — the runtime behavior
// is entirely Prisma's own, this is a type-level description of it, not
// a reimplementation.
interface DatabaseQueryEvent {
  readonly query: string;
  readonly params: string;
  readonly duration: number;
}

// The single database access layer every future repository (Phase
// 1.2D.3+) injects — see docs/architecture/domain-module-guide.md's
// "Import rules." Extends the generated PrismaClient directly (the
// standard NestJS+Prisma pattern), not a wrapper holding a separate
// instance — every Prisma method ($queryRaw, $transaction, model
// delegates once repositories exist) is callable directly on an injected
// PrismaService with no extra indirection.
//
// Prisma 7's `prisma-client` generator uses driver adapters (see
// prisma.config.ts and prisma/seed.ts's own header comment) — the
// runtime client no longer reads DATABASE_URL implicitly, so the adapter
// is built here from the already-validated `database` config namespace,
// never `process.env` directly.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(databaseConfig.KEY)
    dbConfig: ConfigType<typeof databaseConfig>,
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {
    super({
      // Phase 10, Module 1 (Performance) — `max`/`idleTimeoutMillis`/
      // `connectionTimeoutMillis` were previously omitted entirely, so
      // `pg.Pool`'s own undocumented default (`max: 10`, no connection
      // timeout — a saturated pool would hang instead of failing fast)
      // applied with nobody having decided that was right. Now explicit
      // and tunable via the `database` config namespace (env.validation.ts).
      adapter: new PrismaPg({
        connectionString: dbConfig.url,
        ssl: dbConfig.ssl,
        max: dbConfig.poolMax,
        idleTimeoutMillis: dbConfig.poolIdleTimeoutMs,
        connectionTimeoutMillis: dbConfig.poolConnectionTimeoutMs,
      }),
      // `emit: 'event'` (not `'stdout'`) — routes every query event
      // through `this.$on('query', ...)` below instead of printing
      // directly to the console, so it goes through this app's own
      // structured LOGGER (JSON, request-context-aware) like every other
      // log line, not a second, differently-formatted output stream.
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  // Fail-fast, matching this project's established pattern
  // (env.validation.ts) — a database that can't connect at startup
  // should stop the app before any request is served, not fail lazily on
  // the first query.
  //
  // $connect() ALONE does not achieve this with a driver-adapter client
  // (Prisma 7's required pattern here — see this class's header comment):
  // @prisma/adapter-pg wraps a `pg.Pool`, which opens no real socket
  // until first use, so $connect() resolves successfully even against a
  // completely invalid connection string. Confirmed live during this
  // phase's review: booting with a deliberately bad DATABASE_URL still
  // logged "Database connection established" and served requests
  // normally. The real `SELECT 1` below is what actually forces the pool
  // to open a connection and validate it — that's what makes this
  // genuinely fail-fast, not $connect() by itself.
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.logger.info('Database connection established');
    } catch (error) {
      this.logger.error('Database connection failed', { error });
      throw error;
    }

    // "Database duration"/"slow query logging" (Milestone 12 —
    // Performance Engineering). `event.duration` is Prisma's own
    // measurement (query execution time as the adapter reports it, not
    // hand-rolled timing around each call site) — every query gets a
    // `debug`-level entry (available when actually debugging, filtered
    // out by `LOG_LEVEL` in normal operation — see
    // logging/config/logger-options.config.ts), and anything crossing
    // `SLOW_QUERY_THRESHOLD_MS` additionally gets a `warn`, so a slow
    // query is never silently buried in `debug` noise.
    (this as unknown as { $on: (event: 'query', cb: (e: DatabaseQueryEvent) => void) => void }).$on(
      'query',
      (event) => {
        const metadata = { query: event.query, params: event.params, durationMs: event.duration };
        this.logger.debug('Database query executed', metadata);
        if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
          this.logger.warn('Slow database query', metadata);
        }
      },
    );
  }

  // Runs when Nest's shutdown hooks fire (SIGTERM/SIGINT — enabled in
  // main.ts via app.enableShutdownHooks() since Phase 1.2A), draining the
  // connection pool instead of dropping it mid-request.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Database connection closed');
  }

  // Infrastructure-level liveness check — no model-specific query, no
  // business logic. No current caller yet (the health/ controller is
  // still a config-only placeholder, Phase 1.2B.3) — the same "build the
  // capability before its first real consumer" pattern this project has
  // used consistently (RequestContextService, PerformanceLogger).
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      return false;
    }
  }
}
