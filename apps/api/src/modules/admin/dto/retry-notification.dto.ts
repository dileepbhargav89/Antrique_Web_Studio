import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RetryNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
