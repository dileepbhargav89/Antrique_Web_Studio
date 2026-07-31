import { AuthorizationService } from './authorization.service';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuthorizationCache } from '../types/authorization-cache.type';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../metrics/metrics.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Real AuthorizationService instance (no NestJS DI needed — plain
// constructor injection), with hand-written fakes standing in for
// RoleRepository/PermissionRepository so the cache/dedup logic under test
// runs against controllable, call-counted data rather than a real
// database — matching auth.repository.spec.ts's "fake object, no real
// Prisma" reasoning, one level up. A real `CacheService` (Milestone 12),
// not a fake — it's a plain in-memory class with no external
// dependencies, and a FRESH one per `createService()` call keeps every
// test isolated from every other (no cross-request-cache-service
// leakage between specs, matching this file's own "no cross-request
// leakage" test at the bottom for the per-request AuthorizationCache
// layer).
function createService(roleRepository: RoleRepository, permissionRepository: PermissionRepository) {
  return new AuthorizationService(
    roleRepository,
    permissionRepository,
    new CacheService(new MetricsService()),
  );
}

function createFakeRoleRepository(roles: Array<{ id: string; key: string }>) {
  return {
    findRolesForUser: jest.fn(async () => roles),
  } as unknown as RoleRepository;
}

function createFakePermissionRepository(permissions: Array<{ id: string; key: string }>) {
  return {
    findPermissionsForRoles: jest.fn(async () => permissions),
  } as unknown as PermissionRepository;
}

describe('AuthorizationService', () => {
  describe('resolveRoleKeys()', () => {
    it("returns the role keys found for the user's email within the given tenant", async () => {
      const roleRepository = createFakeRoleRepository([
        { id: 'r1', key: 'admin' },
        { id: 'r2', key: 'manager' },
      ]);
      const service = createService(roleRepository, createFakePermissionRepository([]));

      const cache: AuthorizationCache = {};
      const roleKeys = await service.resolveRoleKeys('user@example.com', TENANT_ID, cache);

      expect(roleKeys).toEqual(['admin', 'manager']);
      expect(roleRepository.findRolesForUser).toHaveBeenCalledWith('user@example.com', TENANT_ID);
    });

    it('returns an empty array for a user with no roles', async () => {
      const service = createService(
        createFakeRoleRepository([]),
        createFakePermissionRepository([]),
      );

      expect(await service.resolveRoleKeys('user@example.com', TENANT_ID, {})).toEqual([]);
    });

    it('populates the cache and does not re-query on a second call with the same cache', async () => {
      const roleRepository = createFakeRoleRepository([{ id: 'r1', key: 'admin' }]);
      const service = createService(roleRepository, createFakePermissionRepository([]));
      const cache: AuthorizationCache = {};

      await service.resolveRoleKeys('user@example.com', TENANT_ID, cache);
      await service.resolveRoleKeys('user@example.com', TENANT_ID, cache);

      expect(roleRepository.findRolesForUser).toHaveBeenCalledTimes(1);
      expect(cache.roles).toEqual([{ id: 'r1', key: 'admin' }]);
    });
  });

  describe('resolvePermissionKeys()', () => {
    it("resolves the user's roles, then the union of those roles' permission keys", async () => {
      const roleRepository = createFakeRoleRepository([
        { id: 'r1', key: 'manager' },
        { id: 'r2', key: 'customer' },
      ]);
      const permissionRepository = createFakePermissionRepository([
        { id: 'p1', key: 'projects:read' },
        { id: 'p2', key: 'projects:write' },
      ]);
      const service = createService(roleRepository, permissionRepository);

      const permissionKeys = await service.resolvePermissionKeys('user@example.com', TENANT_ID, {});

      expect(permissionKeys).toEqual(['projects:read', 'projects:write']);
      expect(permissionRepository.findPermissionsForRoles).toHaveBeenCalledWith(
        ['r1', 'r2'],
        TENANT_ID,
      );
    });

    it("dedups permission keys granted by more than one of the user's roles", async () => {
      const roleRepository = createFakeRoleRepository([
        { id: 'r1', key: 'admin' },
        { id: 'r2', key: 'super_admin' },
      ]);
      // Both roles grant the same permission row twice in this fake, the
      // same way two real roles could each have their own RolePermission
      // grant pointing at the identical Permission row.
      const permissionRepository = createFakePermissionRepository([
        { id: 'p1', key: 'projects:read' },
        { id: 'p1', key: 'projects:read' },
      ]);
      const service = createService(roleRepository, permissionRepository);

      expect(await service.resolvePermissionKeys('user@example.com', TENANT_ID, {})).toEqual([
        'projects:read',
      ]);
    });

    it('short-circuits to an empty array without querying permissions when the user has no roles', async () => {
      const permissionRepository = createFakePermissionRepository([]);
      const service = createService(createFakeRoleRepository([]), permissionRepository);

      expect(await service.resolvePermissionKeys('user@example.com', TENANT_ID, {})).toEqual([]);
      expect(permissionRepository.findPermissionsForRoles).not.toHaveBeenCalled();
    });

    it('shares one role lookup across resolveRoleKeys() and resolvePermissionKeys() via the same cache', async () => {
      const roleRepository = createFakeRoleRepository([{ id: 'r1', key: 'admin' }]);
      const permissionRepository = createFakePermissionRepository([
        { id: 'p1', key: 'projects:read' },
      ]);
      const service = createService(roleRepository, permissionRepository);
      const cache: AuthorizationCache = {};

      await service.resolveRoleKeys('user@example.com', TENANT_ID, cache);
      await service.resolvePermissionKeys('user@example.com', TENANT_ID, cache);

      expect(roleRepository.findRolesForUser).toHaveBeenCalledTimes(1);
    });

    it('does not re-query permissions on a second call with the same cache', async () => {
      const roleRepository = createFakeRoleRepository([{ id: 'r1', key: 'admin' }]);
      const permissionRepository = createFakePermissionRepository([
        { id: 'p1', key: 'projects:read' },
      ]);
      const service = createService(roleRepository, permissionRepository);
      const cache: AuthorizationCache = {};

      await service.resolvePermissionKeys('user@example.com', TENANT_ID, cache);
      await service.resolvePermissionKeys('user@example.com', TENANT_ID, cache);

      expect(permissionRepository.findPermissionsForRoles).toHaveBeenCalledTimes(1);
    });

    it('two independent per-request caches for DIFFERENT users each query independently — no cross-user leakage', async () => {
      const roleRepository = createFakeRoleRepository([{ id: 'r1', key: 'admin' }]);
      const service = createService(roleRepository, createFakePermissionRepository([]));

      await service.resolveRoleKeys('user-a@example.com', TENANT_ID, {});
      await service.resolveRoleKeys('user-b@example.com', TENANT_ID, {});

      expect(roleRepository.findRolesForUser).toHaveBeenCalledTimes(2);
    });

    // Milestone 12 (Performance Engineering) — the new behavior this
    // milestone's own CacheService layer adds: the SAME user resolved
    // across TWO SEPARATE per-request AuthorizationCache objects (i.e.
    // two different HTTP requests) now shares one underlying database
    // query, not two — the whole point of caching role/permission
    // resolution across requests, since it's on every
    // PermissionsGuard/RolesGuard-protected route. This is the one real
    // behavior change from the pre-Milestone-12 world (where every
    // request always re-queried); the per-request AuthorizationCache
    // layer itself is completely unchanged (see every test above).
    it('a second per-request cache for the SAME user reuses the cross-request CacheService — one database query total', async () => {
      const roleRepository = createFakeRoleRepository([{ id: 'r1', key: 'admin' }]);
      const service = createService(roleRepository, createFakePermissionRepository([]));

      await service.resolveRoleKeys('user-a@example.com', TENANT_ID, {});
      await service.resolveRoleKeys('user-a@example.com', TENANT_ID, {});

      expect(roleRepository.findRolesForUser).toHaveBeenCalledTimes(1);
    });
  });
});
