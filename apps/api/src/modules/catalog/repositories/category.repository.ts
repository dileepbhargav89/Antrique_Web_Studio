import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Data-access only (this milestone's own requirement) — no validation, no
// business rules; that's CategoryService's job. Mirrors
// authorization/repositories/role.repository.ts's shape: constructor-
// injects PrismaService (kept as `this.prisma`, not just handed to
// super(), so `findManyPaginated()` below can also call
// `this.prisma.$transaction()` — `this.delegate` alone only exposes the
// generic CRUD surface BaseRepository defines).
//
// Tenant isolation (Milestone 5's own requirement — "Every repository
// query must resolve data only from the current TenantContext. Never
// trust client-supplied tenant identifiers.") is structural here:
// `tenantId` is a mandatory, separate parameter on every method, always
// merged into the query by this class itself — never something a caller
// assembles into an arbitrary `where` object that could omit it. Same
// discipline `AuthRepository.findActiveByEmail(email, tenantId)`/
// `RoleRepository.findRolesForUser(email, tenantId)` already established
// (Milestone 4).
@Injectable()
export class CategoryRepository extends BaseRepository<PrismaService['category']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.category);
  }

  // Used by the service before update()/soft-delete to verify the row
  // both exists AND belongs to the caller's tenant before mutating it by
  // `id` alone — the "find-then-act" pattern that keeps a plain
  // `id`-only `update()`/soft-delete call safe afterward, without needing
  // a bespoke tenant-checked update method for every repository.
  findActiveById(id: string, tenantId: string): ReturnType<PrismaService['category']['findFirst']> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  // Pagination + filtering + tenant isolation + soft-delete-awareness in
  // one place (this milestone's own listed repository responsibilities).
  // Transactional findMany+count — see BaseRepository.findManyAndCount()'s
  // own comment for why (this milestone's "Transactions where
  // appropriate" requirement in practice: nested Product writes, see
  // product.repository.ts, get transactional atomicity for free from
  // Prisma's own nested-write semantics, but a paginated list's two
  // independent queries need an explicit one).
  async findManyPaginated(
    tenantId: string,
    where: Prisma.CategoryWhereInput,
    orderBy: Prisma.CategoryOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CategoryWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
