import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Request DTO for POST /follow-ups. Exactly one of `leadId`/`customerId`
// must be given — FollowUpService enforces the XOR (the database's own
// `follow_up_tasks_lead_xor_customer_check` is the backstop) — see
// schema.prisma's own comment on FollowUpTask for why this isn't
// "Customer"-prefixed like Note/Activity/Tag.
export class CreateFollowUpDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // "Due-date validation" (this milestone's own explicit business
  // responsibility) — FollowUpService rejects a `dueAt` in the past.
  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
