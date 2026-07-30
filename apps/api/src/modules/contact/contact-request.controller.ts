import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiValidationError } from '../../common/decorators/api-standard-responses.decorator';
import {
  CONTACT_REQUEST_ROUTE,
  CONTACT_REQUEST_THROTTLE_LIMIT,
  CONTACT_REQUEST_THROTTLE_TTL_MS,
} from './constants/contact.constant';
import { ContactRequestService } from './contact-request.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';

// Deliberately unauthenticated — same kind of exception AuthController's
// own routes are (see that file's own header comment): a marketing-site
// visitor submitting this form isn't logged in. No @ApiBearerAuth() for
// the same reason. Default @Post() status (201 Created) — unlike
// AuthController's routes, this one genuinely creates a resource.
@ApiTags('Contact')
@Controller(CONTACT_REQUEST_ROUTE)
export class ContactRequestController {
  constructor(private readonly contactRequestService: ContactRequestService) {}

  @Post()
  @Throttle({
    default: { limit: CONTACT_REQUEST_THROTTLE_LIMIT, ttl: CONTACT_REQUEST_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Submit a marketing-site contact form',
    description:
      'Public, unauthenticated — rate-limited to ' +
      `${CONTACT_REQUEST_THROTTLE_LIMIT} submissions per client per minute.`,
  })
  @ApiCreatedResponse({ type: ContactRequestResponseDto })
  @ApiValidationError()
  create(
    @Body() dto: CreateContactRequestDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ContactRequestResponseDto> {
    return this.contactRequestService.create(dto, tenant.tenantId);
  }
}
