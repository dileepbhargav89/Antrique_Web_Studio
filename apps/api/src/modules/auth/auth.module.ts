import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';

// The first real (non-reference) domain module, built exactly on
// modules/example-domain/'s template — see
// docs/architecture/domain-module-guide.md. Not @Global(): domain
// modules are scoped by default. Neither provider is exported — nothing
// outside this module needs either yet; a future module that needs
// auth (e.g. a guard, once Phase 1.2D.5+ builds one) exports what it
// genuinely needs then, not speculatively now.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): no longer
// imports `ConfigModule.forFeature(defaultTenantConfig)` — that config
// (relocated to `tenant/config/default-tenant.config.ts`) is now
// consumed exclusively by `TenantResolver`; `AuthRepository` takes
// `tenantId` as a plain method parameter instead (sourced from the
// request's resolved `TenantContext`, read via `@Tenant()` in
// `auth.controller.ts`). See `docs/implementation/decisions.md`.
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
