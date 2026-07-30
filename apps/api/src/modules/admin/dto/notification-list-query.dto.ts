import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../common/dto/cursor-pagination-query.dto';
import { NotificationStatus } from '../../../../generated/prisma/enums';
import { NOTIFICATION_SORT_FIELDS } from '../constants/admin.constant';

// Covers this milestone's own "Filtering": Status, Module (N/A for
// notifications — no module concept on this entity), User, Search,
// Date range, Pagination, Sorting.
// Extends CursorPaginationQueryDto (Phase 10, Module 1) — Notification is
// an append-only, high-growth ledger, one of the two tables that support
// the additive opt-in `cursor` param; see that DTO's own comment.
export class NotificationListQueryDto extends CursorPaginationQueryDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  type?: string;

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
  @IsIn(NOTIFICATION_SORT_FIELDS)
  sortBy?: (typeof NOTIFICATION_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
