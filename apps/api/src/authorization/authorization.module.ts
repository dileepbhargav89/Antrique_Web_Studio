import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';

// RBAC infrastructure (Milestone 3 — Role & Permission Foundation), a new
// top-level infra module mirroring jwt/ (TokenModule) and password/
// (PasswordModule)'s exact precedent: @Global() so RolesGuard/
// PermissionsGuard (common/guards/) can inject AuthorizationService
// without this module being imported into every module that guards a
// route, matching TokenModule/PasswordModule's own reasoning. Not part of
// modules/auth/ — AuthModule stays unchanged (its own
// login()/refresh()/logout() never need role/permission resolution), and
// RolesGuard/PermissionsGuard are cross-cutting common/ guards, the same
// category of consumer TokenService/PasswordService already serve.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): no longer
// imports `ConfigModule.forFeature(defaultTenantConfig)` — RoleRepository/
// PermissionRepository take `tenantId` as a plain method parameter now
// (sourced from the request's resolved `TenantContext`), so this module
// no longer needs the config namespace at all. See
// docs/implementation/decisions.md.
@Global()
@Module({
  providers: [AuthorizationService, RoleRepository, PermissionRepository],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
