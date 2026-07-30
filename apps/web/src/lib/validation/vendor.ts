import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Mirrors `apps/api/src/modules/finance/dto/{create,update}-vendor.dto.ts` field-for-field
 * — same shared-schema convention `lib/validation/client.ts` establishes. `status` is
 * deliberately absent — only the edit dialog exposes it, added directly to that form's own
 * local state rather than here, since create never sets it (matches CreateVendorDto's own
 * omission). */
export const vendorFormSchema = z.object({
  name: z.string().min(1, 'Enter a vendor name.').max(200),
  slug: z
    .string()
    .min(1, 'Enter a slug.')
    .max(200)
    .regex(
      SLUG_PATTERN,
      'Use lowercase letters, numbers, and single hyphens (e.g. "acme-hosting").',
    ),
  contactName: z.string().max(200).optional().or(z.literal('')),
  contactEmail: z.email('Enter a valid email address.').optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  gstin: z.string().max(20).optional().or(z.literal('')),
  paymentTerms: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
