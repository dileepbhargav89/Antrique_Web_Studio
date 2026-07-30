// Central barrel — same convention as config/index.ts, jobs/index.ts.
export { EmailModule } from './email.module';
export { EmailService } from './email.service';
export type { SendEmailInput, SendEmailResult } from './email.service';
export { SendEmailJob } from './jobs/send-email.job';
