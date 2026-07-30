import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// The aggregate root for `AuditLog` — reused wholesale from Phase 1.1A
// (see schema.prisma's own updated comment), this is its first real
// repository. `SystemEvent`'s own data-access lives here too, not in a
// separate repository — both are append-only, tenant-scoped
// observability ledgers this milestone's own "Audit" service
// responsibilities group together ("Record security events"/"Record
// business events"), the same "line-item shaped, grouped under one
// owning repository" precedent `PaymentRepository`'s own handling of
// `PaymentAllocation` (Milestone 10) already established. Exposes no
// update method for either entity — "Audit records are append-only"
// (this milestone's own explicit rule) is enforced structurally here
// AND at the database-privilege level (`UPDATE`/`DELETE` revoked on
// both tables).
@Injectable()
export class AuditRepository extends BaseRepository<PrismaService['auditLog']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.auditLog);
  }

  findById(id: string, tenantId: string) {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.AuditLogWhereInput,
    orderBy: Prisma.AuditLogOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.AuditLogWhereInput = { ...where, tenantId };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Phase 10, Module 1 (Performance) — opt-in cursor pagination (see
  // CursorPaginationQueryDto's own comment for why `id < cursor, id DESC`
  // is equivalent to `createdAt DESC` for a `uuid(7)` PK, and why no new
  // index is needed: this rides the existing PK index). Fetches
  // `take + 1` rows to determine `nextCursor` without a second COUNT
  // query — an unbounded ledger's exact total isn't the point of cursor
  // mode the way it is for `page`/`limit`.
  async findManyByCursor(
    tenantId: string,
    where: Prisma.AuditLogWhereInput,
    cursor: string | undefined,
    take: number,
  ) {
    const scopedWhere: Prisma.AuditLogWhereInput = {
      ...where,
      tenantId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    };
    const rows = await this.delegate.findMany({
      where: scopedWhere,
      orderBy: { id: 'desc' },
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    // `hasMore` is only true when `items.length === take` (>= 1, per
    // PaginationQueryDto's own @Min(1)), so `items` is always non-empty
    // here — TS can't infer that invariant through the ternary above.
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  recordEvent(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.delegate.create({ data });
  }

  recordSystemEvent(data: Prisma.SystemEventUncheckedCreateInput) {
    return this.prisma.systemEvent.create({ data });
  }

  async findSystemEventsPaginated(
    tenantId: string,
    where: Prisma.SystemEventWhereInput,
    orderBy: Prisma.SystemEventOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.SystemEventWhereInput = { ...where, tenantId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.systemEvent.findMany({ where: scopedWhere, orderBy, skip, take }),
      this.prisma.systemEvent.count({ where: scopedWhere }),
    ]);
    return { items, total };
  }

  // Milestone 11 — "Dashboard"/Reporting's own lightweight observability
  // signal: how many ERROR-severity SystemEvents landed in a given
  // window, without pulling every row into application code just to
  // count them.
  countSystemEventsBySeverity(
    tenantId: string,
    severity: Prisma.SystemEventWhereInput['severity'],
    since?: Date,
  ) {
    return this.prisma.systemEvent.count({
      where: { tenantId, severity, ...(since ? { createdAt: { gte: since } } : {}) },
    });
  }
}
