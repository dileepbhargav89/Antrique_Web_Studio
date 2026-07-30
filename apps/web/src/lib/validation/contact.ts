import { z } from 'zod';

/** Shared between `contact/contact-form.tsx` (client validation) and
 * `app/api/contact/route.ts` (server validation) — the single source of truth for this
 * shape, per CONTRIBUTING.md's "shared validation schemas are the source of truth"
 * convention. */
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email address.'),
  company: z.string().optional(),
  message: z.string().min(10, 'Tell us a little more (at least 10 characters).'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
