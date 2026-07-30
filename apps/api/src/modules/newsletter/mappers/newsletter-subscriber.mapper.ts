import { NewsletterSubscriber } from '../../../../generated/prisma/client';
import { NewsletterSubscriberResponseDto } from '../dto/newsletter-subscriber-response.dto';

export function toNewsletterSubscriberResponseDto(
  subscriber: NewsletterSubscriber,
): NewsletterSubscriberResponseDto {
  return new NewsletterSubscriberResponseDto(
    subscriber.id,
    subscriber.email,
    subscriber.status,
    subscriber.subscribedAt,
  );
}
