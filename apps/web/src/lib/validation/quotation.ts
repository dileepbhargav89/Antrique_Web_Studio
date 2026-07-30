import { z } from 'zod';

/** Mirrors apps/api/src/modules/crm/dto/{create,update}-quotation{,-item}.dto.ts
 * field-for-field (see lib/validation/contact.ts's own header comment for this repo's
 * shared-schema convention). `leadId`/`clientId` XOR is validated with `.refine()` —
 * the same rule the backend enforces (assertExactlyOneSubject() + a DB CHECK
 * constraint), checked here too so the form can show one clear error instead of a
 * raw 400 from the API. */
export const quotationItemFormSchema = z.object({
  description: z.string().min(1, 'Required').max(500),
  quantity: z.coerce.number().min(0.01, 'Must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Must be 0 or more'),
});

export const quotationFormSchema = z
  .object({
    leadId: z.string().optional().or(z.literal('')),
    clientId: z.string().optional().or(z.literal('')),
    currency: z.string().max(3).optional().or(z.literal('')),
    taxAmount: z.coerce.number().min(0).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    validUntil: z.string().optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
    items: z.array(quotationItemFormSchema).min(1, 'Add at least one line item'),
  })
  .refine((values) => Boolean(values.leadId) !== Boolean(values.clientId), {
    message: 'Choose either a lead or a client, not both.',
    path: ['clientId'],
  });

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
