import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AUDIT_LOG_SORT_FIELDS } from '../constants/admin.constant';

// Covers this milestone's own "Audit" Controllers: "List, Search" —
// filters: User (actorUserId), Date range, Search (action/resourceType/
// resourceId), Pagination, Sorting. "Status"/"Module" (the shared
// Filtering list) don't apply here — `AuditLog` has neither concept.
export class AuditLogListQueryDto extends PaginationQueryDto {
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
