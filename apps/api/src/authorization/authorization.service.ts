import { Injectable } from '@nestjs/common';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuthorizationCache } from '../types/authorization-cache.type';
import { CacheService } from '../cache/cache.service';

// 60s — long enough to eliminate the role/permission database round trip
// for the overwhelming majority of requests in any real usage burst (this
// is resolved on EVERY `PermissionsGuard`/`RolesGuard`-protected request,
// which by Milestone 12 is most routes in this API), short enough that a
// role/permission grant change (today: seed-data-only, no live
// RoleController/PermissionController exists to change one at runtime)
// is never stale for more than a minute even with no explicit
// invalidation call anywhere. If a future milestone adds a live grant-
// editing endpoint, that's the point to add a real
// `cache.deleteByPrefix('role-keys:' + tenantId)` call alongside it —
// this TTL is a deliberate, honest stopgap for "nothing mutates this at
// runtime yet," not a substitute for real invalidation once something
// does.
const ROLE_CACHE_TTL_MS = 60_000;

// Resolves a user's roles/permissions for RolesGuard/PermissionsGuard
// (common/guards/) — never verifies or signs JWTs itself (TokenService,
// apps/api/src/jwt/, remains the only JWT component; this service never
// imports it), and never queried by AuthController's login()/refresh()
// (those stay unchanged this milestone). Database-driven: every answer
// comes from a real query through RoleRepository/PermissionRepository,
// nothing hardcoded.
//
// Stateless itself — a singleton (Nest's default scope) with no mutable
// instance fields, so there's nothing here that could leak one caller's
// resolved roles/permissions into a concurrent, unrelated request. "Cache
// within a request only" (Milestone 3's own requirement) is achieved
// by every method taking the CALLER's `AuthorizationCache` (a plain
// object the guard creates fresh per request and stores on
// `request.authorizationCache` — see types/authorization-cache.type.ts)
// and mutating it in place; this service holds no cache of its own.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): both methods now
// take `tenantId` — the caller (RolesGuard/PermissionsGuard) reads it
// from the request's resolved `TenantContext` and passes it straight
// through to RoleRepository/PermissionRepository, which are themselves
// now tenant-parameterized rather than injecting a stopgap config value.
// "Resolve roles and permissions within the resolved tenant" (this
// milestone's own requirement) — a user's roles are tenant-scoped rows
// (`UserRole.tenantId`), so resolving against the WRONG tenant would
// either find nothing (if the user has no grants in that tenant) or,
// worse, silently mix grants across tenants if the query weren't scoped
// at all; threading the real resolved `tenantId` through is what keeps
// this correct now that the tenant is no longer a fixed constant.
@Injectable()
export class AuthorizationService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly cache: CacheService,
  ) {}

  async resolveRoleKeys(
    email: string,
    tenantId: string,
    cache: AuthorizationCache,
  ): Promise<readonly string[]> {
    const roles = await this.loadRoles(email, tenantId, cache);
    return roles.map((role) => role.key);
  }

  async resolvePermissionKeys(
    email: string,
    tenantId: string,
    cache: AuthorizationCache,
  ): Promise<readonly string[]> {
    if (cache.permissionKeys) {
      return cache.permissionKeys;
    }

    const roles = await this.loadRoles(email, tenantId, cache);
    if (roles.length === 0) {
      cache.permissionKeys = [];
      return cache.permissionKeys;
    }

    const permissions = await this.permissionRepository.findPermissionsForRoles(
      roles.map((role) => role.id),
      tenantId,
    );
    // Dedup across roles: two roles granting the same permission (e.g.
    // both `admin` and `super_admin` granting `projects:read`) must
    // surface it once, not once per granting role.
    cache.permissionKeys = [...new Set(permissions.map((permission) => permission.key))];
    return cache.permissionKeys;
  }

  // Shared by both resolve*Keys() methods above so a route guarded by
  // both RolesGuard and PermissionsGuard (not used anywhere yet, but
  // architecturally supported) resolves the user's roles from the
  // database (or the cross-request CacheService, see below) once per
  // request, not twice — `cache` here is the CALLER's per-request
  // AuthorizationCache (Milestone 3's own "cache within a request only"
  // requirement), a completely different object from this class's own
  // injected `this.cache: CacheService` (Milestone 12's cross-request
  // cache) — the naming collision is between two DELIBERATELY distinct
  // caching layers, not a bug: this method now checks the fast,
  // request-local `cache.roles` first (as always), and only on a MISS
  // there does it fall through to `this.cache.getOrLoad()` — a slower
  // but still not-a-database-query cross-request layer — before finally
  // hitting `RoleRepository` itself.
  private async loadRoles(
    email: string,
    tenantId: string,
    cache: AuthorizationCache,
  ): Promise<readonly { id: string; key: string }[]> {
    if (!cache.roles) {
      cache.roles = await this.cache.getOrLoad(
        `role-keys:${tenantId}:${email.toLowerCase()}`,
        ROLE_CACHE_TTL_MS,
        () => this.roleRepository.findRolesForUser(email, tenantId),
      );
    }
    return cache.roles;
  }
}
