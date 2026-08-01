import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALLOWED_CONTACT_REQUEST_SOURCES } from '../constants/contact.constant';

// Request DTO for POST /contact-requests. Field shapes mirror the
// frontend's own `lib/validation/contact.ts` `contactFormSchema` exactly
// (name min 2, email, company optional, message min 10) — deliberately,
// so the frontend's existing client-side validation never disagrees with
// what this route actually accepts.
export class CreateContactRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  // Same permissive pattern as the frontend's own lib/validation/contact.ts
  // `PHONE_PATTERN` — international mobile numbers vary too widely in
  // format to validate more strictly than "plausible-length digits/
  // separators."
  @IsOptional()
  @Matches(/^[0-9+()\-\s]{7,20}$/, { message: 'phone must be a valid mobile number' })
  phone?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  // Optional override, restricted to a fixed allow-list (see that
  // constant's own comment for why) — lets the quote-wizard route tag
  // itself distinctly from the plain contact form without opening this
  // public endpoint up to an arbitrary caller-supplied source value.
  // Defaults to CONTACT_REQUEST_SOURCE in the service when omitted.
  @IsOptional()
  @IsIn(ALLOWED_CONTACT_REQUEST_SOURCES)
  source?: string;
}
