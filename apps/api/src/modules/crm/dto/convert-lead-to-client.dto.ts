import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /leads/:id/convert-to-client — the agency-pipeline
// counterpart to ConvertLeadDto's "convert to Customer" (an unrelated,
// e-commerce lifecycle; see lead.service.ts's own comment on why both
// coexist). Client.name is required and has no source on Lead other than
// the OPTIONAL `organization` field — `name` here is required only when
// the lead has no `organization` set (enforced in LeadService, not here,
// since it depends on the lead's own data); when both are given, the
// request body wins. `website`/`primaryPhone` have no Lead source at all
// (Lead collects neither) — always come from this DTO if wanted.
export class ConvertLeadToClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsEmail()
  primaryEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
