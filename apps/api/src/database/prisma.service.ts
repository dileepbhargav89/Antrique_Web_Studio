import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../generated/prisma/client';
import databaseConfig from '../config/database/database.config';
import { LOGGER, Logger } from '../logging';
import { TenantRlsContextService } from './tenant-rls-context.service';
import { MetricsService } from '../metrics/metrics.service';
import { withTransactionRetry } from './db-transaction-retry';

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

// Phase 10, Module 3 (Security Hardening) — the exact session variable
// name `database-schema.md`'s own RLS strategy section documents and the
// RLS policy migration (`20260717091500_row_level_security`) reads via
// `current_setting('app.current_tenant_id', true)`.
const TENANT_RLS_SETTING = 'app.current_tenant_id';

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
  // Phase 10, Module 3 (Security Hardening) — a SEPARATE, plain
  // `PrismaClient` (own adapter/pool, own connection string, NEVER
  // `$extends()`-ed or property-patched) used ONLY to open the
  // SET-LOCAL-wrapping transactions below. This is load-bearing, not
  // incidental: an earlier version of this fix opened those transactions
  // via `this.$transaction(...)`/`super.$transaction(...)` — but `tx`,
  // the transaction-scoped client Prisma hands to that callback, is
  // derived from the SAME client object it was opened on, so calling
  // `this.$transaction(...)` on an instance whose own model-delegate
  // properties are already patched (see the constructor below) produces
  // a `tx` that ALSO carries those patches. Any `tx.someModel.method()`
  // call inside then re-triggered the SAME `$allOperations` hook, which
  // opened ANOTHER transaction, which produced ANOTHER patched `tx` —
  // true infinite recursion, confirmed live: a single `GET /leads`-style
  // request exhausted the entire connection pool and every request
  // failed with Prisma's own "Unable to start a transaction in the given
  // time" (P2028). `rawTxClient` never gets patched, so any `tx` it
  // produces is genuinely raw — verified with a throwaway spike before
  // committing to this shape (see decisions.md's 2026-07-30 RLS entry).
  private readonly rawTxClient: PrismaClient;

  constructor(
    @Inject(databaseConfig.KEY)
    dbConfig: ConfigType<typeof databaseConfig>,
    @Inject(LOGGER)
    private readonly logger: Logger,
    private readonly tenantRlsContext: TenantRlsContextService,
    private readonly metrics: MetricsService,
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
        // Phase 10, Module 9 (DB Reliability) — Postgres's own
        // `statement_timeout` startup parameter, sent for every connection
        // this pool opens. Previously unset (no ceiling at all): a stuck or
        // runaway query held a pooled connection indefinitely. See
        // `rawTxClient`'s own adapter below for why both clients need this,
        // not just this one.
        statement_timeout: dbConfig.statementTimeoutMs,
      }),
      // `emit: 'event'` (not `'stdout'`) — routes every query event
      // through `this.$on('query', ...)` below instead of printing
      // directly to the console, so it goes through this app's own
      // structured LOGGER (JSON, request-context-aware) like every other
      // log line, not a second, differently-formatted output stream.
      log: [{ emit: 'event', level: 'query' }],
    });

    // Own pool, same size budget as the primary connection (see class
    // comment for why a second client is unavoidable here) — in the
    // worst case this doubles real connections to at most 2×`poolMax`,
    // still comfortably under Postgres's own default `max_connections`
    // (100). The primary connection above stays in place for `$queryRaw`/
    // `$executeRaw` call sites (which this fix doesn't intercept — see
    // below) and the startup health check.
    this.rawTxClient = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: dbConfig.url,
        ssl: dbConfig.ssl,
        max: dbConfig.poolMax,
        idleTimeoutMillis: dbConfig.poolIdleTimeoutMs,
        connectionTimeoutMillis: dbConfig.poolConnectionTimeoutMs,
        // Same statement timeout as the primary client's adapter above —
        // every real model query now runs through THIS client (see the
        // `$allOperations` hook below), so a runaway query inside one of
        // its own SET-LOCAL-wrapped transactions needs the same ceiling, or
        // this pool (not the primary one) is the one that actually
        // exhausts under a stuck query.
        statement_timeout: dbConfig.statementTimeoutMs,
      }),
      // Same "database duration"/"slow query logging" treatment as the
      // primary client below — every real query now runs through
      // `rawTxClient` (see the `$allOperations` hook), so without this
      // it would be entirely invisible to the app's own structured logs.
      log: [{ emit: 'event', level: 'query' }],
    });

    // Closes the RLS gap flagged in Module 1 / blockers.md: every model
    // call now runs through a `SET LOCAL`-equivalent `set_config(...,
    // true)` for the current request's tenant (from
    // `TenantRlsContextService`, seeded by `TenantMiddleware`), inside
    // its own transaction on `rawTxClient` — RLS's own
    // `current_setting('app.current_tenant_id', true)` predicate only
    // ever sees a value when it was set inside the SAME transaction as
    // the query.
    //
    // `$extends`'s `$allOperations` hook intercepts every model call —
    // INCLUDING ones captured early by a repository (e.g.
    // `BaseRepository`'s `delegate = prisma.someModel`, captured once at
    // repository-construction time), because the interception happens by
    // MONKEY-PATCHING this instance's own model-delegate properties
    // below, not by repositories consuming a differently-typed client.
    // Zero repository files change.
    //
    // No context (seed scripts, health checks, migrations, anything
    // outside `TenantMiddleware`'s `run()`) → `query(args)` unchanged,
    // no transaction wrapping, no overhead — RLS only activates when a
    // request actually resolved a tenant.
    //
    // Raw SQL call sites (`$queryRaw`/`$executeRawUnsafe`, e.g.
    // `InventoryRepository`'s aggregate queries) are NOT intercepted by
    // this hook — Prisma's `$allOperations` only covers model-delegate
    // operations. Every existing raw-SQL call site already interpolates
    // `tenantId` directly into its own `WHERE` clause (confirmed during
    // this module's own security audit — see decisions.md), so app-layer
    // scoping already covers them; this is a known, documented gap in
    // RLS's specific coverage, not in tenant isolation overall.
    //
    // Known, deliberate trade-off: `BaseRepository.findManyAndCount()`'s
    // array-form `$transaction([findMany, count])` exists so both queries
    // see the identical snapshot (its own doc comment). Once each of
    // those two calls independently opens its own SET-LOCAL transaction
    // via this hook, they see two independent (though near-simultaneous)
    // snapshots instead of one shared one — under a rare concurrent write
    // landing between them, `total` could technically disagree with
    // `items` by one row. This is a display/pagination nicety, not a
    // security property, and is judged an acceptable trade-off against
    // the actual security value of RLS coverage on every read — see
    // `BaseRepository.findManyAndCount()`'s own comment for the same
    // note at that call site.
    const extended = this.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }) => {
            const tenantId = this.tenantRlsContext.getContext()?.tenantId;
            if (!tenantId || !model) {
              return query(args);
            }
            // Phase 10, Module 9 (DB Reliability) — safe to retry the whole
            // transaction from scratch on a transient failure (write
            // conflict/deadlock/connection blip): nothing committed if it
            // fails, by Postgres's own definition of those SQLSTATEs (see
            // isRetryableTransactionError()'s own comment). Does not retry
            // constraint violations or the RLS-recursion-bug code (P2028) —
            // same function, same exclusions.
            return withTransactionRetry(
              () =>
                this.rawTxClient.$transaction(async (tx) => {
                  await tx.$executeRawUnsafe(
                    `SELECT set_config($1, $2, true)`,
                    TENANT_RLS_SETTING,
                    tenantId,
                  );
                  const delegate = (
                    tx as unknown as Record<string, Record<string, (a: unknown) => unknown>>
                  )[model]!;
                  return delegate[operation]!(args);
                }),
              { metrics: this.metrics, logger: this.logger },
            );
          },
        },
      },
    });

    for (const key of Object.keys(this)) {
      if (!key.startsWith('$') && key !== 'rawTxClient' && key in extended) {
        (this as unknown as Record<string, unknown>)[key] = (
          extended as unknown as Record<string, unknown>
        )[key];
      }
    }
  }

  // Phase 10, Module 3 (Security Hardening) — overrides the INTERACTIVE
  // (callback) form only; the array form (`$transaction([...])`, used by
  // `findManyAndCount()`) passes through to `super.$transaction()`
  // unchanged — each array member already went through the constructor's
  // `$allOperations` hook individually when constructed (see that
  // comment for the accepted snapshot-consistency trade-off).
  //
  // Opens on `rawTxClient`, same reasoning as the constructor's hook —
  // opening on `this` (patched) would hand application code's own
  // `runInTransaction(async (tx) => { tx.someModel.create(...) })`
  // callbacks a `tx` that ALSO carries the patched properties, causing
  // the exact same recursion. One `set_config()` call at the top of the
  // transaction, not one per statement inside it — `SET LOCAL`/
  // `set_config(..., true)` persists for the transaction's full
  // duration, so every real repository method called on the SAME `tx`
  // afterward (e.g. every `*InTx()` method — `OrderRepository
  // .createInTx()`, `InvoiceRepository`'s equivalents) already sees it
  // without needing its own wrap. This is also what application code's
  // own `repository.runInTransaction(async (tx) => { ... })` methods
  // (Order/Invoice/Payment/Lead/FollowUp/Quotation) route through — zero
  // changes needed there either, since every one of them already calls
  // `this.prisma.$transaction(work)` directly.
  override $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T>;
  override $transaction<T extends Prisma.PrismaPromise<unknown>[]>(
    arg: [...T],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
  override $transaction(arg: unknown, options?: unknown): Promise<unknown> {
    if (typeof arg === 'function') {
      const tenantId = this.tenantRlsContext.getContext()?.tenantId;
      const fn = arg as (tx: Prisma.TransactionClient) => Promise<unknown>;
      // Phase 10, Module 9 (DB Reliability) — same retry-at-the-transaction-
      // -boundary reasoning as the constructor's `$allOperations` hook
      // above; see that call site's comment. Caller-supplied `fn(tx)`
      // callbacks were spot-checked (not structurally enforced) for non-DB
      // side effects a retry would double-execute — none found across this
      // codebase's real `runInTransaction()` callers (Order/Invoice/
      // Payment/Lead/FollowUp/Quotation) at the time this was written.
      return withTransactionRetry(
        () =>
          this.rawTxClient.$transaction(async (tx) => {
            if (tenantId) {
              await tx.$executeRawUnsafe(
                `SELECT set_config($1, $2, true)`,
                TENANT_RLS_SETTING,
                tenantId,
              );
            }
            return fn(tx);
          }, options as never),
        { metrics: this.metrics, logger: this.logger },
      );
    }
    return super.$transaction(arg as never, options as never);
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
    //
    // Registered on BOTH clients (Phase 10, Module 3) — since
    // `rawTxClient` now runs every real model query (see the
    // `$allOperations` hook), logging only `this` would make the
    // majority of this app's actual database traffic invisible.
    this.registerQueryLogging(this);
    this.registerQueryLogging(this.rawTxClient);
  }

  private registerQueryLogging(client: PrismaClient): void {
    (
      client as unknown as { $on: (event: 'query', cb: (e: DatabaseQueryEvent) => void) => void }
    ).$on('query', (event) => {
      const metadata = { query: event.query, params: event.params, durationMs: event.duration };
      this.logger.debug('Database query executed', metadata);
      if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn('Slow database query', metadata);
      }
      // Phase 10, Module 6 (Monitoring) — the exact same `event.duration`
      // already logged above, additionally recorded as a metric. See
      // `MetricsService`'s own comment for why this is unlabeled (no
      // per-model/per-route breakdown — not cheaply available at this
      // call site).
      this.metrics.recordDbQuery(event.duration);
    });
  }

  // Runs when Nest's shutdown hooks fire (SIGTERM/SIGINT — enabled in
  // main.ts via app.enableShutdownHooks() since Phase 1.2A), draining the
  // connection pool instead of dropping it mid-request.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.rawTxClient.$disconnect();
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
