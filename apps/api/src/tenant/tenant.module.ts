import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import defaultTenantConfig from './config/default-tenant.config';
import { TenantResolver } from './tenant-resolver.service';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { OrganizationRepository } from './repositories/organization.repository';

// Tenant resolution infrastructure (Milestone 4 — Organization &
// Multi-Tenant Foundation). Not `@Global()`: unlike `TokenModule`/
// `PasswordModule`/`AuthorizationModule`, nothing outside this module
// injects `TenantResolver`/`OrganizationRepository` directly — every
// consumer reads the already-resolved `request.tenantContext`/
// `request.organizationContext` via `common/decorators/tenant.decorator.ts`/
// `organization.decorator.ts` instead. This module only needs to be
// imported into `AppModule` so its own `configure()` below runs and
// registers `TenantMiddleware` application-wide.
//
// Imports `ConfigModule.forFeature(defaultTenantConfig)` — the
// `defaultTenant` namespace, now owned here (relocated from
// `modules/auth/config/` this milestone — see `config/
// default-tenant.config.ts`'s own comment for why).
@Module({
  imports: [ConfigModule.forFeature(defaultTenantConfig)],
  providers: [TenantResolver, TenantMiddleware, OrganizationRepository],
})
export class TenantModule implements NestModule {
  // `forRoutes('*')` — scoped to `app.setGlobalPrefix()`'s `/api` prefix
  // (a documented Nest behavior for `MiddlewareConsumer`-configured
  // middleware, see `TenantMiddleware`'s own comment) — deliberately
  // fine here: every current and planned route lives under `/api`, and
  // this is what makes `TenantResolver`'s thrown `BadRequestException`
  // correctly reach Nest's exception-filter pipeline, unlike the raw
  // `app.use()` pattern `HttpLoggingMiddleware` needed for a different
  // reason (prefix-agnostic logging, not exception-filter integration).
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
