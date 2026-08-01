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

/** Mirrors apps/api/src/modules/crm/dto/create-payment-stage.dto.ts. */
export const paymentStageFormSchema = z.object({
  label: z.string().min(1, 'Required').max(200),
  triggerNote: z.string().max(500).optional().or(z.literal('')),
  percentage: z.coerce.number().min(0).max(100),
});

/** Mirrors apps/api's PAYMENT_STAGE_PERCENTAGE_TOTAL/_TOLERANCE
 * (crm.constant.ts) — the same floating-point tolerance the backend
 * validates against, so a form that passes here never gets a surprise
 * 400 back from the server. */
export const PAYMENT_STAGE_PERCENTAGE_TOTAL = 100;
export const PAYMENT_STAGE_PERCENTAGE_TOLERANCE = 0.01;

/** Mirrors apps/api's DEFAULT_PAYMENT_STAGES (crm.constant.ts) — the
 * schedule a new quotation form starts pre-filled with. */
export const DEFAULT_PAYMENT_STAGES: ReadonlyArray<{
  label: string;
  triggerNote: string;
  percentage: number;
}> = [
  { label: 'Advance Payment', triggerNote: 'Due on acceptance of this proposal', percentage: 40 },
  {
    label: 'Milestone Payment',
    triggerNote: 'Due on completion of the development milestone',
    percentage: 40,
  },
  { label: 'Final Payment', triggerNote: 'Due prior to final delivery & handover', percentage: 20 },
];

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
    paymentStages: z.array(paymentStageFormSchema).min(1, 'Add at least one payment stage'),
  })
  .refine((values) => Boolean(values.leadId) !== Boolean(values.clientId), {
    message: 'Choose either a lead or a client, not both.',
    path: ['clientId'],
  })
  .refine(
    (values) =>
      Math.abs(
        values.paymentStages.reduce((sum, stage) => sum + stage.percentage, 0) -
          PAYMENT_STAGE_PERCENTAGE_TOTAL,
      ) <= PAYMENT_STAGE_PERCENTAGE_TOLERANCE,
    {
      message: 'Payment stage percentages must sum to 100.',
      path: ['paymentStages'],
    },
  );

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;
