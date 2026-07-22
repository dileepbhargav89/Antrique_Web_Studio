import { IsString, MinLength } from 'class-validator';

// Request DTO for PATCH /customer-notes/:id. No `customerId` — a note is
// never re-parented to a different customer, same "immutable ownership"
// discipline every other module's own update DTO follows for its FK
// fields.
export class UpdateCustomerNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
