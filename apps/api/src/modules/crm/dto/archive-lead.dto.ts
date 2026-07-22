import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
