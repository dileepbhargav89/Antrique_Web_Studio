import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/enums';
import { TASK_SORT_FIELDS } from '../constants/projects.constant';

// `status`/`assigneeId`/`milestoneId` filters back both the List view and
// the Kanban board (one column === one `status` filter value client-side).
export class TaskListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsIn(TASK_SORT_FIELDS)
  sortBy?: (typeof TASK_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
