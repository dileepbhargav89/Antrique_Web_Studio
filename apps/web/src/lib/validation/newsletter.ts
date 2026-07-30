import { z } from 'zod';

/** Shared between `marketing/newsletter-form.tsx` (client validation) and
 * `app/api/newsletter/route.ts` (server validation) — same shared-schema convention as
 * `lib/validation/contact.ts`. */
export const newsletterFormSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

export type NewsletterFormValues = z.infer<typeof newsletterFormSchema>;
