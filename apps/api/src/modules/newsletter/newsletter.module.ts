import { Module } from '@nestjs/common';
import { NewsletterSubscriberController } from './newsletter-subscriber.controller';
import { NewsletterSubscriberService } from './newsletter-subscriber.service';
import { NewsletterSubscriberRepository } from './repositories/newsletter-subscriber.repository';

// Phase 7 (Real Email) — same shape as modules/contact/contact.module.ts.
// Not @Global(). No explicit `imports: [EmailModule]` — see
// contact.module.ts's own comment for why.
@Module({
  controllers: [NewsletterSubscriberController],
  providers: [NewsletterSubscriberService, NewsletterSubscriberRepository],
})
export class NewsletterModule {}
