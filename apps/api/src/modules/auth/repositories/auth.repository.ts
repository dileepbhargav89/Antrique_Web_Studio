import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Same shape as example-domain/repositories/example.repository.ts —
// targets User, inheriting findOne/findMany/create/update/delete from
// BaseRepository, plus one real custom query method: findActiveByEmail().
// Depends only on PrismaService — never `process.env`/a config namespace
// directly.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): no longer
// injects `defaultTenantConfig` itself. Through Milestone 3, this class
// tenant-scoped its query via a constructor-injected stopgap config
// value; now `tenantId` is a plain method parameter, sourced by the
// caller (`AuthService.login()`) from the request's resolved
// `TenantContext` (`tenant/tenant-resolver.service.ts` /
// `tenant/middleware/tenant.middleware.ts`) — real, request-based
// resolution, not a hardcoded default. See
// `docs/implementation/decisions.md` for the full reasoning.
@Injectable()
export class AuthRepository extends BaseRepository<PrismaService['user']> {
  constructor(prisma: PrismaService) {
    super(prisma.user);
  }

  // `deletedAt: null` excludes soft-deleted users — a soft-deleted
  // account's email may already be legitimately reused by a different
  // live account (see schema.prisma's User model comment on the partial
  // unique index), so a lookup that ignored deletedAt could match the
  // wrong row. `mode: 'insensitive'` matches the database's own
  // uniqueness guarantee (`users_tenant_id_email_key` is
  // `(tenant_id, LOWER(email)) WHERE deleted_at IS NULL` — see the
  // `partial_unique_indexes` migration): the constraint already treats
  // "Foo@x.com" and "foo@x.com" as one account, so the lookup must too,
  // or a user could be locked out by typing their own email in different
  // case than however it happened to be stored.
  findActiveByEmail(
    email: string,
    tenantId: string,
  ): ReturnType<PrismaService['user']['findFirst']> {
    return this.delegate.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        tenantId,
        deletedAt: null,
      },
    });
  }
}
