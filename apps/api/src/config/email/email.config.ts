import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Phase 7 (Real Email) — transactional email (Resend) provider config.
// Both fields are optional (see env.validation.ts's own comment on
// RESEND_API_KEY/EMAIL_FROM_ADDRESS) — EmailService reads `apiKey` and
// no-ops with a logged warning when it's unset, rather than this factory
// throwing at boot. Distinct from `config/notifications/` (which
// channel/when to notify, not the email transport itself — see that
// domain's own README).
export default registerAs('email', () => {
  const env = validateEnv();
  return {
    apiKey: env.RESEND_API_KEY,
    fromAddress: env.EMAIL_FROM_ADDRESS,
  };
});
