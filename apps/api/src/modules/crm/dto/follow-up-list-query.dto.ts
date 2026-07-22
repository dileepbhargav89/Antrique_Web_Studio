import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FollowUpStatus } from '../../../../generated/prisma/enums';
import { FOLLOW_UP_SORT_FIELDS } from '../constants/crm.constant';

// Covers this milestone's own "Filtering": Status, Assigned user, Date
// range (on `dueAt`), Search (title/description), Pagination, Sorting.
export class FollowUpListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

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
  @IsIn(FOLLOW_UP_SORT_FIELDS)
  sortBy?: (typeof FOLLOW_UP_SORT_FIELDS)[number] = 'dueAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
