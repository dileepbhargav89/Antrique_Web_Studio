import { z } from 'zod';

/** Mirrors `apps/api/src/modules/projects/dto/create-project.dto.ts` field-for-field — same
 * shared-schema convention as `lib/validation/client.ts`. `status` is absent — every Project
 * starts DRAFT server-side (see CreateProjectDto's own comment). */
export const projectFormSchema = z.object({
  clientId: z.string().min(1, 'Select a client.'),
  name: z.string().min(1, 'Enter a project name.').max(200),
  summary: z.string().max(2000).optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
