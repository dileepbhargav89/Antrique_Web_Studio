import { z } from 'zod';

/** Mirrors `apps/api/src/modules/crm/dto/{create,update}-client.dto.ts` field-for-field —
 * the single source of truth for the Client create/edit form shape (see
 * `lib/validation/contact.ts`'s own header comment for this repo's shared-schema
 * convention). `status` is deliberately absent — only the edit dialog exposes it, added
 * directly to that form's own schema rather than here, since create never sets it
 * (matches CreateClientDto's own omission). */
export const clientFormSchema = z.object({
  name: z.string().min(1, 'Enter a client name.').max(200),
  industry: z.string().max(200).optional().or(z.literal('')),
  website: z.string().max(500).optional().or(z.literal('')),
  primaryEmail: z.email('Enter a valid email address.').optional().or(z.literal('')),
  primaryPhone: z.string().max(50).optional().or(z.literal('')),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
