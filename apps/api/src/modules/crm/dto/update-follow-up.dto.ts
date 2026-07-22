import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Request DTO for PATCH /follow-ups/:id. No `leadId`/`customerId` (never
// re-parented) and no `status` (Complete/Cancel/Reopen are their own
// dedicated endpoints). "Completed follow-ups cannot be edited" (this
// milestone's own explicit rule) is enforced by FollowUpService
// rejecting ANY field here once `status !== PENDING`.
export class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
