import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiConflictError,
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import {
  CONTACT_REQUEST_ROUTE,
  CONTACT_REQUEST_THROTTLE_LIMIT,
  CONTACT_REQUEST_THROTTLE_TTL_MS,
} from './constants/contact.constant';
import { ContactRequestService } from './contact-request.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ContactRequestListQueryDto } from './dto/contact-request-list-query.dto';
import { ConvertContactRequestDto } from './dto/convert-contact-request.dto';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';

@ApiTags('Contact')
@Controller(CONTACT_REQUEST_ROUTE)
export class ContactRequestController {
  constructor(private readonly contactRequestService: ContactRequestService) {}

  // Deliberately unauthenticated — same kind of exception AuthController's
  // own routes are (see that file's own header comment): a marketing-site
  // visitor submitting this form isn't logged in. No @ApiBearerAuth() for
  // the same reason. Default @Post() status (201 Created) — genuinely
  // creates a resource.
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

  // The rest of these routes are staff-only (Sales/Admin/Super Admin, per
  // prisma/seed.ts's ROLES) — the inbox/triage view this module's own
  // README previously flagged as "not built."
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTACT_REQUESTS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List contact-form submissions (paginated, filterable)' })
  @ApiPaginatedResponse(ContactRequestResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ContactRequestListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ContactRequestResponseDto>> {
    return this.contactRequestService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTACT_REQUESTS_READ)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get a contact-form submission by id' })
  @ApiOkResponse({ type: ContactRequestResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('contact request')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ContactRequestResponseDto> {
    return this.contactRequestService.findById(id, tenant.tenantId);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTACT_REQUESTS_WRITE)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Convert a contact-form submission into a CRM lead',
    description:
      'Terminal — creates a new Lead from this submission’s own fields and records a ' +
      'LEAD_CREATED activity event. Fails if an active lead for this email already exists.',
  })
  @ApiOkResponse({ type: ContactRequestResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('contact request')
  @ApiConflictError(
    'The request is already converted/closed/spam, or an active lead for this email already exists.',
  )
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertContactRequestDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ContactRequestResponseDto> {
    return this.contactRequestService.convert(id, dto, tenant.tenantId);
  }
}
