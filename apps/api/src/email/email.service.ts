import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Resend } from 'resend';
import emailConfig from '../config/email/email.config';
import { LOGGER, Logger } from '../logging';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult =
  | { status: 'sent'; id: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

// Phase 7 (Real Email) — the one place this app talks to Resend. Never
// throws out of `send()` itself: callers (SendEmailJob, see
// jobs/send-email.job.ts) go through JobRunner fire-and-forget, so a
// thrown error here would surface as an unhandled rejection instead of a
// retried job attempt. `skipped` (no RESEND_API_KEY/EMAIL_FROM_ADDRESS
// configured) is the honest no-op path — the app must keep working with
// zero real email credentials (see env.validation.ts's own comment on
// both vars) — distinct from `failed` (a real, configured provider call
// that errored), which IS worth retrying.
@Injectable()
export class EmailService {
  private readonly client: Resend | null;

  constructor(
    @Inject(emailConfig.KEY) private readonly config: ConfigType<typeof emailConfig>,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.client = this.config.apiKey ? new Resend(this.config.apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client || !this.config.fromAddress) {
      this.logger.warn('Email send skipped — RESEND_API_KEY/EMAIL_FROM_ADDRESS not configured', {
        to: input.to,
        subject: input.subject,
      });
      return { status: 'skipped', reason: 'Email provider not configured' };
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: this.config.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      if (error) {
        this.logger.error('Email send failed', {
          to: input.to,
          subject: input.subject,
          error: error.message,
        });
        return { status: 'failed', error: error.message };
      }

      this.logger.info('Email sent', { to: input.to, subject: input.subject, id: data?.id });
      return { status: 'sent', id: data?.id ?? '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Email send threw', {
        to: input.to,
        subject: input.subject,
        error: message,
      });
      return { status: 'failed', error: message };
    }
  }
}
