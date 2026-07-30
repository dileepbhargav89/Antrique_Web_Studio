import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Exactly one of taskId/milestoneId — validated in CommentService
// (application-level, matching the DB CHECK constraint), same "exactly
// one of" shape Quotation/FollowUpTask already use.
export class CreateCommentDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
