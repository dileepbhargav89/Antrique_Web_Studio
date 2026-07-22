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

// Request DTO for PATCH /leads/:id. No `status` (archive/convert have
// their own dedicated endpoints) — "Archived leads immutable" is
// enforced by LeadService rejecting ANY field here once the lead's
// current status is terminal (ARCHIVED/CONVERTED), not by omitting a
// specific field from this DTO.
export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

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
