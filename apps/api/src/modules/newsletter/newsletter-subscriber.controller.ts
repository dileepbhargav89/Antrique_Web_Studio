import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiValidationError } from '../../common/decorators/api-standard-responses.decorator';
import {
  NEWSLETTER_SUBSCRIBER_ROUTE,
  NEWSLETTER_SUBSCRIBER_THROTTLE_LIMIT,
  NEWSLETTER_SUBSCRIBER_THROTTLE_TTL_MS,
} from './constants/newsletter.constant';
import { NewsletterSubscriberService } from './newsletter-subscriber.service';
import { CreateNewsletterSubscriberDto } from './dto/create-newsletter-subscriber.dto';
import { NewsletterSubscriberResponseDto } from './dto/newsletter-subscriber-response.dto';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';

// Deliberately unauthenticated — same reasoning as
// modules/contact/contact-request.controller.ts's own header comment.
@ApiTags('Newsletter')
@Controller(NEWSLETTER_SUBSCRIBER_ROUTE)
export class NewsletterSubscriberController {
  constructor(private readonly newsletterSubscriberService: NewsletterSubscriberService) {}

  @Post()
  @Throttle({
    default: {
      limit: NEWSLETTER_SUBSCRIBER_THROTTLE_LIMIT,
      ttl: NEWSLETTER_SUBSCRIBER_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Subscribe to the newsletter',
    description:
      'Public, unauthenticated — idempotent (subscribing an already-subscribed email is a ' +
      `no-op success, not a conflict). Rate-limited to ${NEWSLETTER_SUBSCRIBER_THROTTLE_LIMIT} ` +
      'submissions per client per minute.',
  })
  @ApiCreatedResponse({ type: NewsletterSubscriberResponseDto })
  @ApiValidationError()
  subscribe(
    @Body() dto: CreateNewsletterSubscriberDto,
    @Tenant() tenant: TenantContext,
  ): Promise<NewsletterSubscriberResponseDto> {
    return this.newsletterSubscriberService.subscribe(dto, tenant.tenantId);
  }
}
