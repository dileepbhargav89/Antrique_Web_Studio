import { Injectable } from '@nestjs/common';
import { AuditRepository } from './repositories/audit.repository';
import { AuditLogListQueryDto } from './dto/audit-log-list-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { toAuditLogResponseDto } from './mappers/audit-log.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';
import { SystemEventSeverity } from '../../../generated/prisma/enums';

export interface RecordAuditEventParams {
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordSystemEventParams {
  type: string;
  source: string;
  summary: string;
  severity?: SystemEventSeverity;
  relatedResourceType?: string;
  relatedResourceId?: string;
  metadata?: Record<string, unknown>;
}

// Business logic + repository orchestration + mapping. This milestone's
// own "Audit" business responsibilities:
// - "Record security events" / "Record business events" — both
//   ultimately write to the SAME `AuditLog` table (its own `action`
//   field is free-text — "security.login_failed" vs.
//   "business.order_created" is a naming CONVENTION future callers
//   apply, not a schema-level distinction; `AuditLog` never modeled one,
//   so this milestone doesn't invent one either). Two named methods,
//   not one, matching this milestone's own explicit two-item business-
//   responsibility list — but genuinely the same underlying write, no
//   artificial behavioral difference forced between them.
// - "Immutable audit history" — no update method exists anywhere in
//   this service; `AuditRepository` exposes none either, and the
//   database itself revokes `UPDATE`/`DELETE` on `audit_logs` — three
//   independent layers agreeing, not just one.
@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  recordSecurityEvent(
    params: RecordAuditEventParams,
    tenantId: string,
  ): Promise<AuditLogResponseDto> {
    return this.recordEvent(params, tenantId);
  }

  recordBusinessEvent(
    params: RecordAuditEventParams,
    tenantId: string,
  ): Promise<AuditLogResponseDto> {
    return this.recordEvent(params, tenantId);
  }

  private async recordEvent(
    params: RecordAuditEventParams,
    tenantId: string,
  ): Promise<AuditLogResponseDto> {
    const entry = await this.auditRepository.recordEvent({
      tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      before: params.before as Prisma.InputJsonValue | undefined,
      after: params.after as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    return toAuditLogResponseDto(entry);
  }

  // Not one of this milestone's own named "Audit" business
  // responsibilities directly, but the write side of the `SystemEvent`
  // ledger this milestone's own "Core entities" list names — reused by
  // `NotificationService`-adjacent future callers and by this module's
  // own Dashboard error-rate signal (`AuditRepository.countSystemEventsBySeverity()`).
  async recordSystemEvent(params: RecordSystemEventParams, tenantId: string): Promise<void> {
    await this.auditRepository.recordSystemEvent({
      tenantId,
      type: params.type,
      source: params.source,
      summary: params.summary,
      severity: params.severity ?? SystemEventSeverity.INFO,
      relatedResourceType: params.relatedResourceType,
      relatedResourceId: params.relatedResourceId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    });
  }

  // "List, Search" — this milestone's own "Audit" Controllers list; a
  // free-text `search` filter IS the "Search" action, not a separate
  // route (same "one endpoint, a search param" convention every other
  // module's own list endpoint already uses).
  async list(
    query: AuditLogListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { resourceType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.auditRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toAuditLogResponseDto), total, page, limit);
  }
}
