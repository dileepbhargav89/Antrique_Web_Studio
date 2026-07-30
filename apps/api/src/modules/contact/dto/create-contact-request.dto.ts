import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}
