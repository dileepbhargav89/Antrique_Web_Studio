import { IsString, IsUUID, MinLength } from 'class-validator';

// Request DTO for POST /customer-notes. "Rich text supported" — `body` is
// a sanitized HTML/markdown string, not a dedicated rich-text entity —
// see schema.prisma's own comment on CustomerNote.
export class CreateCustomerNoteDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  @MinLength(1)
  body!: string;
}
