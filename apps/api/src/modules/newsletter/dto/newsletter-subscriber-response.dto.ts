import { NewsletterSubscriberStatus } from '../../../../generated/prisma/enums';

export class NewsletterSubscriberResponseDto {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly status: NewsletterSubscriberStatus,
    readonly subscribedAt: Date,
  ) {}
}
