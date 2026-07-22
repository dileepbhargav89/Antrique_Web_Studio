import { IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /leads/:id/convert. The resulting Customer's
// fields (email/name) are derived from the Lead itself
// (`contactEmail`/`contactName`) — no separate customer payload to
// submit, since the whole point of conversion is "this lead's own
// contact info becomes the customer's."
export class ConvertLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
