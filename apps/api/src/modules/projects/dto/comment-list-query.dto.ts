import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Exactly one of taskId/milestoneId is required — validated in
// CommentService, not here (PaginationQueryDto subclasses don't
// cross-validate two optional fields against each other at the class-
// validator layer elsewhere in this codebase either).
export class CommentListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;
}
