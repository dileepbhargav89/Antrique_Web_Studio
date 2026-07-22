import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { NotificationStatus } from '../../../../generated/prisma/enums';
import { NOTIFICATION_SORT_FIELDS } from '../constants/admin.constant';

// Covers this milestone's own "Filtering": Status, Module (N/A for
// notifications — no module concept on this entity), User, Search,
// Date range, Pagination, Sorting.
export class NotificationListQueryDto extends PaginationQueryDto {
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
