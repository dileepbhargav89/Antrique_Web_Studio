import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { MetricsModule } from './metrics/metrics.module';
import { JobsModule } from './jobs/jobs.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { PdfModule } from './pdf/pdf.module';
import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './modules/contact/contact.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AiModule } from './ai/ai.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ProposalGeneratorModule } from './modules/proposal-generator/proposal-generator.module';
import { RequirementAnalyzerModule } from './modules/requirement-analyzer/requirement-analyzer.module';
import { ProjectEstimatorModule } from './modules/project-estimator/project-estimator.module';
import { TaskGeneratorModule } from './modules/task-generator/task-generator.module';
import { ContentAssistantModule } from './modules/content-assistant/content-assistant.module';
import { EmailAssistantModule } from './modules/email-assistant/email-assistant.module';
import { FinanceModule } from './modules/finance/finance.module';

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
    // Metrics collection (Phase 10, Module 6 — Monitoring) — GET /metrics
    // (Prometheus exposition format). @Global(), same precedent as
    // TokenModule/PasswordModule/CacheModule/JobsModule — HttpLoggingMiddleware
    // (this module's own providers, below) and PrismaService/
    // InMemoryDeadLetterStore (DatabaseModule/JobsModule) all consume
    // MetricsService without importing this module themselves. Registered
    // ahead of JobsModule below, one of its consumers. See
    // metrics/README.md.
    MetricsModule,
    // Background job infrastructure (Milestone 14; scheduling added
    // Phase 10, Module 7) — Job/JobRunner/retry/dead-letter abstractions,
    // now with one real scheduled consumer (AuthModule's
    // SessionCleanupScheduler). Still zero Redis-backed queue — see
    // jobs/README.md and this module's own writeup in
    // docs/architecture/operations.md for why.
    JobsModule,
    // `@nestjs/schedule`'s own module — required once, globally, for any
    // `@Cron()`/`@Interval()`/`@Timeout()` decorator anywhere in the app
    // to actually register with its internal `SchedulerRegistry` (Phase
    // 10, Module 7's first real consumer: AuthModule's
    // SessionCleanupScheduler). In-process, per-instance timers only —
    // no distributed lock/exactly-once coordination across multiple
    // instances, deliberately: see SessionCleanupScheduler's own comment
    // for why that's the right trade-off for the one job that uses this
    // today.
    ScheduleModule.forRoot(),
    // Real transactional email (Phase 7) — @Global() Resend client
    // wrapper + the SendEmailJob every fire-and-forget send goes through
    // JobRunner with. Registered ahead of ContactModule/NewsletterModule
    // below, its first two real consumers. See email/README.md.
    EmailModule,
    // Real S3-compatible object storage (Phase 7) — @Global(), consumed
    // by CatalogModule's new ProductImageService
    // (`POST /products/:id/images`). Array position doesn't affect
    // resolution (Global providers are available regardless of import
    // order), grouped here with EmailModule for documentation clarity.
    // See storage/README.md.
    StorageModule,
    // Shared PDF-generation infra (Phase 7, Enterprise CRM/Project-
    // Management) — @Global() DocumentPdfService, consumed by
    // CrmModule's new QuotationService (Invoice, Phase 5, is a known
    // second consumer). See pdf/README.md.
    PdfModule,
    // Tenant branding (company info + logo for quotation letterheads) —
    // @Global(), same tier as StorageModule/PdfModule above. Two real
    // consumers from day one: this module's own SettingsController (Admin
    // Settings page) and CrmModule's QuotationService (PDF letterhead) —
    // living here, not nested under AdminModule, is what avoids a
    // circular import (AdminModule already imports CrmModule). See
    // settings/settings.module.ts's own comment.
    SettingsModule,
    // Marketing-site contact form (Phase 7) — ContactRequest's first real
    // consumer (the model existed since Phase 1.1A, unused). Public,
    // unauthenticated route. See modules/contact/README.md.
    ContactModule,
    // Marketing-site newsletter signup (Phase 7) — NewsletterSubscriber
    // is a new model, added this phase. Public, unauthenticated route.
    // See modules/newsletter/README.md.
    NewsletterModule,
    // Project/Task/Milestone (Phase 7) — Project/ProjectMember/Milestone/
    // Task/Document/ActivityLog REST APIs, tenant-scoped, RBAC-protected
    // via PermissionsGuard. Imports CrmModule (exported ClientRepository/
    // LeadRepository) — see modules/projects/projects.module.ts for the
    // full reasoning. The one genuine greenfield build the Phase 7
    // workflow audit found (docs/implementation/phase-7-workflow-matrix.md)
    // — schema fully modeled since Phase 1.1A, zero consumers until now.
    ProjectsModule,
    // AI provider abstraction (Phase 8, Step 1) — @Global() strategy/
    // factory over four LLM providers (Anthropic real+tested, OpenAI/
    // Gemini/OpenRouter structural). Registered ahead of PromptsModule
    // below, its first real consumer. See ai/README.md.
    AiModule,
    // Prompt Library (Phase 8, Step 2) — versioned PromptTemplate REST
    // API, tenant-scoped, RBAC-protected via PermissionsGuard. Imports
    // nothing beyond the global AiModule (its render-and-test action).
    // See modules/prompts/README.md.
    PromptsModule,
    // Proposal Generator (Phase 8, Step 3) — one action, no persistence
    // (see modules/proposal-generator/README.md for why). Imports
    // CrmModule + PromptsModule.
    ProposalGeneratorModule,
    // Requirement Analyzer (Phase 8, Step 4) — one action, no persistence
    // beyond the uploaded document itself (StorageService). Imports
    // PromptsModule.
    RequirementAnalyzerModule,
    // Project Estimator (Phase 8, Step 5) — one action, no persistence.
    // Imports PromptsModule.
    ProjectEstimatorModule,
    // Task Generator (Phase 8, Step 6) — generate drafts nothing-written,
    // approve creates real Task rows via Phase 7's TaskService. Imports
    // PromptsModule + ProjectsModule.
    TaskGeneratorModule,
    // Content Assistant (Phase 8, Step 7) — persists ContentDraft rows,
    // unlike Steps 3-6's ephemeral shape. Imports PromptsModule.
    ContentAssistantModule,
    // Email Assistant (Phase 8, Step 8) — generate (drafts, no send) +
    // send (real, via the existing EmailService, no AI call). Imports
    // PromptsModule.
    EmailAssistantModule,
    // Enterprise Operations Suite, Module 1: Finance (Phase 9, Step 1 —
    // Vendor Management) — Vendor REST API, tenant-scoped, RBAC-protected
    // via PermissionsGuard. Distinct from BillingModule (Invoice/Payment/
    // Tax) and InventoryModule (Supplier — product/inventory sourcing, a
    // different concept). Imports nothing yet; Steps 2-7 (Purchase
    // Orders, Expenses, Invoice PDF+email, Refunds, GST tax config,
    // Revenue/P&L/Cash-Flow dashboards) extend this same module. See
    // modules/finance/README.md.
    FinanceModule,
    // Remaining business modules attach here as they're built, each
    // owning its own controllers/services/repositories per
    // apps/api/src/modules/*/README.md and following
    // docs/architecture/domain-module-guide.md's standards:
    //   ContentModule
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
