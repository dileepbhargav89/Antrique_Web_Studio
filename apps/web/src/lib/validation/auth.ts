import { z } from 'zod';

/** Shared shape for `app/(auth)/login/login-form.tsx`'s client validation. The real
 * backend does its own independent validation regardless (`LoginRequestDto`) — this only
 * governs client-side UX (don't submit until this is satisfied), not the API contract. */
export const loginFormSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
