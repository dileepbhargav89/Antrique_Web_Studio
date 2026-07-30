import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MilestoneStatus } from '../../../../generated/prisma/enums';
import { MILESTONE_SORT_FIELDS } from '../constants/projects.constant';

export class MilestoneListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsIn(MILESTONE_SORT_FIELDS)
  sortBy?: (typeof MILESTONE_SORT_FIELDS)[number] = 'dueDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
