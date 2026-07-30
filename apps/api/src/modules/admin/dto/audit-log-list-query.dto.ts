import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../common/dto/cursor-pagination-query.dto';
import { AUDIT_LOG_SORT_FIELDS } from '../constants/admin.constant';

// Covers this milestone's own "Audit" Controllers: "List, Search" —
// filters: User (actorUserId), Date range, Search (action/resourceType/
// resourceId), Pagination, Sorting. "Status"/"Module" (the shared
// Filtering list) don't apply here — `AuditLog` has neither concept.
// Extends CursorPaginationQueryDto (Phase 10, Module 1) — AuditLog is an
// append-only, high-growth ledger, one of the two tables that support the
// additive opt-in `cursor` param; see that DTO's own comment.
export class AuditLogListQueryDto extends CursorPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(AUDIT_LOG_SORT_FIELDS)
  sortBy?: (typeof AUDIT_LOG_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
