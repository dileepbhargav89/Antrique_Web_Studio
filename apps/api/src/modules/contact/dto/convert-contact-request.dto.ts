import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /contact-requests/:id/convert. The resulting Lead's
// contact fields are derived from the ContactRequest itself
// (name/email/company) — same "the source record's own fields become the
// new record's fields" reasoning as convert-lead.dto.ts. `serviceInterest`
// lets the triaging staff member tag what the contact is actually asking
// about, since ContactRequest itself has no such field (free-text
// `message` only).
export class ConvertContactRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceInterest?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
