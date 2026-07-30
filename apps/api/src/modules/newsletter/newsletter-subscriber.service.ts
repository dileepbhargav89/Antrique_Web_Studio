import { Inject, Injectable } from '@nestjs/common';
import { NewsletterSubscriberRepository } from './repositories/newsletter-subscriber.repository';
import { CreateNewsletterSubscriberDto } from './dto/create-newsletter-subscriber.dto';
import { NewsletterSubscriberResponseDto } from './dto/newsletter-subscriber-response.dto';
import { toNewsletterSubscriberResponseDto } from './mappers/newsletter-subscriber.mapper';
import { NewsletterSubscriberStatus } from '../../../generated/prisma/enums';
import { JobRunner } from '../../jobs';
import { SendEmailJob } from '../../email';
import { LOGGER, Logger } from '../../logging';
import { escapeHtml } from '../../utils/html.util';

// Upsert-by-email, not a plain create — resubscribing an already-
// subscribed email is a no-op success, not a conflict (this module's own
// judgment call, see modules/newsletter/README.md), and a previously
// unsubscribed email flips back to SUBSCRIBED rather than erroring.
@Injectable()
export class NewsletterSubscriberService {
  constructor(
    private readonly newsletterSubscriberRepository: NewsletterSubscriberRepository,
    private readonly jobRunner: JobRunner,
    private readonly sendEmailJob: SendEmailJob,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async subscribe(
    dto: CreateNewsletterSubscriberDto,
    tenantId: string,
  ): Promise<NewsletterSubscriberResponseDto> {
    const existing = await this.newsletterSubscriberRepository.findActiveByEmail(
      dto.email,
      tenantId,
    );

    const subscriber = existing
      ? existing.status === NewsletterSubscriberStatus.UNSUBSCRIBED
        ? await this.newsletterSubscriberRepository.update({
            where: { id: existing.id },
            data: {
              status: NewsletterSubscriberStatus.SUBSCRIBED,
              subscribedAt: new Date(),
              unsubscribedAt: null,
            },
          })
        : existing
      : await this.newsletterSubscriberRepository.create({
          data: { tenantId, email: dto.email },
        });

    // Fire-and-forget confirmation email — see
    // ContactRequestService.create()'s identical comment for why this is
    // never awaited and why the `.catch()` below is defensive only.
    void this.jobRunner
      .run(this.sendEmailJob, {
        to: subscriber.email,
        subject: "You're subscribed",
        html: `<p>Hi,</p><p>You're on the list at ${escapeHtml(subscriber.email)} — thanks for subscribing.</p>`,
      })
      .then((result) => {
        if (result.status === 'dead_letter') {
          this.logger.error('Newsletter confirmation email exhausted retries', {
            newsletterSubscriberId: subscriber.id,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        this.logger.error('Newsletter confirmation email job threw unexpectedly', {
          newsletterSubscriberId: subscriber.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return toNewsletterSubscriberResponseDto(subscriber);
  }
}
