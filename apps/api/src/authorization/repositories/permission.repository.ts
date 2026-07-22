import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../database/base.repository';

// Data-access only, the same discipline role.repository.ts follows.
// Milestone 4: no longer injects `defaultTenantConfig` — `tenantId` is a
// plain method parameter now, see role.repository.ts's identical
// comment.
@Injectable()
export class PermissionRepository extends BaseRepository<PrismaService['permission']> {
  constructor(prisma: PrismaService) {
    super(prisma.permission);
  }

  // `Permission` itself has no tenantId column — it's a global catalog
  // (schema.prisma's own comment) — but the RolePermission join table
  // that grants a permission to a role IS tenant-scoped, so filtering
  // through `rolePermissions.some({ tenantId })` still honestly satisfies
  // CLAUDE.md's "tenant scope on EVERY query" rule at the one point in
  // this query where a tenant boundary genuinely applies (which roles'
  // grants count), rather than skipping tenant-scoping because the target
  // model itself happens to have no tenantId field.
  //
  // Returns raw Permission rows for the given role ids — deduping to
  // distinct permission keys is AuthorizationService's job
  // (resolvePermissionKeys()), keeping this method a plain data-access
  // query, not an authorization decision.
  findPermissionsForRoles(
    roleIds: string[],
    tenantId: string,
  ): ReturnType<PrismaService['permission']['findMany']> {
    return this.delegate.findMany({
      where: {
        rolePermissions: {
          some: {
            roleId: { in: roleIds },
            tenantId,
          },
        },
      },
    });
  }
}
