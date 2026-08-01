import { z } from 'zod';

/** Mirrors `apps/api/src/settings/dto/update-branding.dto.ts` field-for-field — see
 * `lib/validation/contact.ts`'s own header comment for this repo's shared-schema
 * convention. Every field optional (a partial-merge PATCH, not a full-replace PUT — see
 * that DTO's own comment); empty strings from controlled `<Input>`s are stripped before
 * hitting the API by the form's own submit handler, same pattern `client.ts` establishes. */
export const brandingFormSchema = z.object({
  companyName: z.string().max(200).optional().or(z.literal('')),
  tagline: z.string().max(200).optional().or(z.literal('')),
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.email('Enter a valid email address.').optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
  taxId: z.string().max(50).optional().or(z.literal('')),
  bankDetails: z.string().max(1000).optional().or(z.literal('')),
});

export type BrandingFormValues = z.infer<typeof brandingFormSchema>;
