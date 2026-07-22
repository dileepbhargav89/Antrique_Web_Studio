import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelFollowUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
