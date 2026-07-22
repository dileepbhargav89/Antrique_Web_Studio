import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../database/base.repository';

// Data-access only (Milestone 3's own requirement) — no role/permission
// resolution logic here, that's AuthorizationService's job
// (authorization.service.ts). Mirrors modules/auth/repositories/
// auth.repository.ts's exact shape.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): no longer
// injects `defaultTenantConfig` — `tenantId` is now a plain method
// parameter, sourced by `AuthorizationService` from the request's
// resolved `TenantContext` (`tenant/`), the same refactor
// `AuthRepository` went through. See
// docs/implementation/decisions.md.
@Injectable()
export class RoleRepository extends BaseRepository<PrismaService['role']> {
  constructor(prisma: PrismaService) {
    super(prisma.role);
  }

  // Resolves by email, not userId: RequestUser (types/request-user.type.ts)
  // is deliberately `{ email }` only (Milestone 2's own scope boundary,
  // unchanged by this milestone — see docs/implementation/decisions.md for
  // why this milestone doesn't extend the JWT payload/RequestUser to add
  // one). Joins Role -> UserRole -> User in a single query via a nested
  // relation filter, rather than a separate "look up the user first" step
  // through AuthRepository — that would require exporting AuthRepository
  // out of AuthModule (currently exports nothing) purely so a different
  // top-level module could reach into it, a heavier cross-module coupling
  // this simpler, self-contained query avoids entirely.
  //
  // Tenant-scoped via the caller-supplied `tenantId` (CLAUDE.md's
  // non-negotiable "tenant scope on EVERY query" rule), on both the Role
  // itself and the nested User (a soft-deleted or wrong-tenant user must
  // not grant roles). `deletedAt: null` on both Role and User excludes
  // soft-deleted rows, matching AuthRepository.findActiveByEmail()'s same
  // reasoning.
  findRolesForUser(email: string, tenantId: string): ReturnType<PrismaService['role']['findMany']> {
    return this.delegate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        userRoles: {
          some: {
            user: {
              email: { equals: email, mode: 'insensitive' },
              tenantId,
              deletedAt: null,
            },
          },
        },
      },
    });
  }
}
