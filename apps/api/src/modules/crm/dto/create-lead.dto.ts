import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

// Request DTO for POST /leads. Either `source` (free text — the
// existing, pre-Milestone-9 column) or `leadSourceId` (this milestone's
// new formal lookup) must be given — LeadService resolves the final
// `source` string from whichever is provided (see lead.service.ts's own
// comment). `status`/`convertedClientId`/`convertedCustomerId` are
// intentionally absent — every Lead starts at NEW, conversion/archival
// happen only through their own dedicated endpoints.
export class CreateLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsUUID()
  leadSourceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceInterest?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
