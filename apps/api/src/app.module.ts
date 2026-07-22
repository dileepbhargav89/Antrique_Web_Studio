import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, securityConfig } from './config';
import { LoggingModule } from './logging';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { ExceptionLoggingFilter } from './common/filters/exception-logging.filter';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';
import { ExampleDomainModule } from './modules/example-domain/example-domain.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TokenModule } from './jwt/token.module';
import { PasswordModule } from './password/password.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { TenantModule } from './tenant/tenant.module';
import { CacheModule } from './cache/cache.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { BespokeModule } from './modules/bespoke/bespoke.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CrmModule } from './modules/crm/crm.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule,
    // Global rate limiting (Milestone 13 — Security Hardening) —
    // "Implement... global rate limiting... Do not introduce Redis. Use
    // application-level protection only." `@nestjs/throttler`'s default
    // storage is an in-memory Map (no Redis needed — the same
    // "application-level only" constraint CacheService, Milestone 12,
    // already followed). Reads the ALREADY-VALIDATED, previously-unused
    // `security` config namespace (`RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`,
    // `env.validation.ts`) — validated since Phase 1.2B, genuinely
    // consumed for the first time here, the same "build the capability,
    // wire it up when the moment is right" pattern this codebase keeps
    // repeating (PerformanceLogger in Milestone 12, AUDIT_LOGGER in this
    // one). One named ("default") throttler profile, applied globally via
    // ThrottlerGuard below; `POST /auth/login` carries its own, stricter
    // `@Throttle()` override (see auth.controller.ts) — brute-force
    // resistance needs a much tighter budget than the general API.
    ThrottlerModule.forRootAsync({
      imports: [NestConfigModule.forFeature(securityConfig)],
      inject: [securityConfig.KEY],
      useFactory: (config: ReturnType<typeof securityConfig>) => ({
        throttlers: [{ ttl: config.rateLimitWindowMs, limit: config.rateLimitMax }],
      }),
    }),
    // Logging subsystem — real Logger bound (Phase 1.2C.3), request
    // context plumbing (Phase 1.2C.4), see logging/logging.module.ts.
    LoggingModule,
    // Database access layer — @Global() (Phase 1.2D.2), so every future
    // domain module's repository can inject PrismaService without
    // importing DatabaseModule itself. Registered ahead of any module
    // that depends on it, same reasoning as ConfigModule/LoggingModule
    // above. See database/README.md.
    DatabaseModule,
    // Tenant resolution (Milestone 4 — Organization & Multi-Tenant
    // Foundation) — NOT @Global(); registers TenantMiddleware
    // application-wide via its own NestModule.configure(), so nothing
    // else needs to import this module to benefit from it. Every request
    // gets `request.tenantContext`/`request.organizationContext`
    // attached before any guard/controller runs — see
    // apps/api/src/tenant/README.md.
    TenantModule,
    // JWT infrastructure — @Global() (Phase 1.2D.6), so any future module
    // can inject TokenService without importing TokenModule itself. Not
    // currently consumed by AuthModule or anything else — infrastructure
    // only, see jwt/README.md.
    TokenModule,
    // Password hashing infrastructure — @Global() (Phase 1.2D.7), so any
    // future module can inject PasswordService without importing
    // PasswordModule itself. Not currently consumed by AuthModule or
    // anything else — infrastructure only, see password/README.md.
    PasswordModule,
    // Application-level caching infrastructure (Milestone 12 —
    // Performance Engineering) — @Global(), same precedent as
    // TokenModule/PasswordModule. Registered ahead of AuthorizationModule
    // below, its own first real consumer. See cache/README.md.
    CacheModule,
    // RBAC infrastructure — @Global() (Milestone 3 — Role & Permission
    // Foundation), so RolesGuard/PermissionsGuard (common/guards/) can
    // inject AuthorizationService without every guarded module importing
    // this one. Milestone 12 added a short-TTL CacheService read-through
    // in front of its own database resolution — see
    // authorization/README.md.
    AuthorizationModule,
    // Phase 1.2D.1 reference/template module (GET /example/ping only) —
    // not a real business domain, see modules/example-domain/README.md.
    // Wired in exactly the way every real domain module below it will be.
    ExampleDomainModule,
    // First real business module (Phase 1.2D.4) — authentication
    // foundation only, every endpoint a placeholder. See
    // modules/auth/README.md.
    AuthModule,
    // Product Catalog Foundation (Milestone 5) — Category/Collection/
    // Product REST APIs, tenant-scoped, RBAC-protected via
    // PermissionsGuard. Not @Global(), like every real domain module.
    // See modules/catalog/README.md.
    CatalogModule,
    // Bespoke Customizer Engine (Milestone 6) — Fabric/MeasurementProfile/
    // StyleOption/ProductCustomization REST APIs, tenant-scoped,
    // RBAC-protected via PermissionsGuard, built on top of CatalogModule
    // (imports it for ProductRepository — see modules/bespoke/bespoke.module.ts).
    // See modules/bespoke/README.md.
    BespokeModule,
    // Inventory & Stock Management (Milestone 7) — Warehouse/Inventory/
    // Supplier REST APIs, tenant-scoped, RBAC-protected via
    // PermissionsGuard. Imports nothing (see modules/inventory/inventory.module.ts
    // for why) — the only module in this arc with zero cross-module
    // imports. See modules/inventory/README.md.
    InventoryModule,
    // Order Management & Checkout (Milestone 8) — the orchestration
    // layer coordinating Catalog/Bespoke/Inventory (imports all three —
    // see modules/orders/orders.module.ts for the full reasoning),
    // tenant-scoped, RBAC-protected via PermissionsGuard. See
    // modules/orders/README.md.
    OrdersModule,
    // CRM & Customer Operations (Milestone 9) — Lead/CustomerNote/
    // CustomerActivity/FollowUp/CustomerTag REST APIs, tenant-scoped,
    // RBAC-protected via PermissionsGuard. Imports OrdersModule (for its
    // exported CustomerRepository — see modules/crm/crm.module.ts for
    // the full reasoning). See modules/crm/README.md.
    CrmModule,
    // Payments & Billing Foundation (Milestone 10) — Invoice/Payment/Tax
    // REST APIs, tenant-scoped, RBAC-protected via PermissionsGuard.
    // Imports OrdersModule (exported CustomerRepository/OrderRepository)
    // and CatalogModule (exported ProductRepository) — see
    // modules/billing/billing.module.ts for the full reasoning. See
    // modules/billing/README.md.
    BillingModule,
    // Admin Platform, Analytics & Notifications (Milestone 11) —
    // Notification/Audit/Dashboard/Report REST APIs, tenant-scoped,
    // RBAC-protected via PermissionsGuard. Imports OrdersModule/
    // InventoryModule/BillingModule/CrmModule/CatalogModule (the most
    // cross-module-dependent module in this arc — see
    // modules/admin/admin.module.ts for the full reasoning). See
    // modules/admin/README.md.
    AdminModule,
    // Health checks (Milestone 14 — Production Infrastructure) —
    // GET /health/{live,ready,startup}, unauthenticated, unversioned,
    // unprefixed (see health/health.controller.ts). Not @Global(); its one
    // dependency, PrismaService, already is.
    HealthModule,
    // Background job infrastructure (Milestone 14) — Job/JobRunner/retry/
    // dead-letter abstractions only, zero real scheduled jobs, zero Redis/
    // queue backend. See jobs/README.md.
    JobsModule,
    // Remaining business modules attach here as they're built, each
    // owning its own controllers/services/repositories per
    // apps/api/src/modules/*/README.md and following
    // docs/architecture/domain-module-guide.md's standards:
    //   ProjectsModule, ContentModule
  ],
  controllers: [],
  providers: [
    // HttpLoggingMiddleware (Phase 1.2C.5) is a provider here (not wired
    // via NestModule.configure()/MiddlewareConsumer) so main.ts can
    // resolve a real instance with `app.get()` and attach it via raw
    // `app.use()` — see main.ts for why. It's never injected by anything
    // else in this module; it's listed here purely to make it
    // DI-resolvable.
    HttpLoggingMiddleware,
    // ExceptionLoggingFilter (Phase 1.2C.6) — APP_FILTER is Nest's own
    // DI-native global-filter mechanism (unlike middleware, exception
    // filters aren't route-matched, so there's no MiddlewareConsumer-style
    // prefix-scoping risk here). Logs every unhandled exception, then
    // delegates to Nest's default handling — see
    // common/filters/exception-logging.filter.ts.
    { provide: APP_FILTER, useClass: ExceptionLoggingFilter },
    // ThrottlerGuard (Milestone 13 — Security Hardening) — APP_GUARD is
    // Nest's own DI-native global-guard mechanism, the same reasoning
    // APP_FILTER/APP_INTERCEPTOR already use. Runs before every
    // per-route guard (JwtAuthGuard/RolesGuard/PermissionsGuard, applied
    // via @UseGuards() on individual routes) — global guards execute
    // first, so an excessive request is rejected with 429 before this
    // app spends any work verifying its JWT or querying the database.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // CacheControlInterceptor (Milestone 12 — Performance Engineering) —
    // APP_INTERCEPTOR is Nest's own DI-native global-interceptor
    // mechanism, the same reasoning APP_FILTER above already uses.
    // A no-op on every route except the small, deliberately-reviewed set
    // carrying `@CacheControl(...)` — see that decorator's own comment.
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
  ],
})
export class AppModule {}
