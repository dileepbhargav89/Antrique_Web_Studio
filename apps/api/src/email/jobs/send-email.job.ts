import { Injectable } from '@nestjs/common';
import { Job, JobContext } from '../../jobs';
import { EmailService, SendEmailInput } from '../email.service';

// Phase 7 (Real Email) — the JobRunner-shaped wrapper both ContactRequestService
// and NewsletterSubscriberService fire-and-forget through, so sending gets the
// same retry/backoff every other job gets for free (see jobs/README.md — "retrying
// a FAILED delivery" was that infrastructure's own named first-consumer guess).
// Only a `failed` EmailService result throws (worth retrying); `skipped` (no
// provider configured) is not an error — see email.service.ts's own comment.
@Injectable()
export class SendEmailJob implements Job<SendEmailInput> {
  readonly name = 'send-email';

  constructor(private readonly emailService: EmailService) {}

  async execute(payload: SendEmailInput, _context: JobContext): Promise<void> {
    const result = await this.emailService.send(payload);
    if (result.status === 'failed') {
      throw new Error(`Email send failed: ${result.error}`);
    }
  }
}
