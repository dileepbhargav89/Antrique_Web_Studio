import { IsEmail } from 'class-validator';

// Request DTO for POST /newsletter-subscribers. Mirrors the frontend's
// own `lib/validation/newsletter.ts` `newsletterFormSchema` — email only.
export class CreateNewsletterSubscriberDto {
  @IsEmail()
  email!: string;
}
