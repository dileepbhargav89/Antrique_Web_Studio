import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LEAD_ROUTE } from './constants/crm.constant';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ArchiveLeadDto } from './dto/archive-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadListQueryDto } from './dto/lead-list-query.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
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

// This milestone's own "Lead" Controllers list: Create, Update, Archive,
// Convert, Get, List — no Delete (Archive is the terminal write action;
// this milestone names no stricter RBAC tier for it, unlike Milestone
// 8's own Cancel, so it stays under `leads:write` alongside Create/
// Update/Convert).
@ApiTags('Lead')
@ApiBearerAuth('bearer')
@Controller(LEAD_ROUTE)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_WRITE)
  @ApiOperation({ summary: 'Create a lead' })
  @ApiCreatedResponse({ type: LeadResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('An active (non-archived, non-converted) lead for this email already exists.')
  create(@Body() dto: CreateLeadDto, @Tenant() tenant: TenantContext): Promise<LeadResponseDto> {
    return this.leadService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_READ)
  @ApiOperation({ summary: 'List leads (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(LeadResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: LeadListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<LeadResponseDto>> {
    return this.leadService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_READ)
  @ApiOperation({ summary: 'Get a lead by id' })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('lead')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<LeadResponseDto> {
    return this.leadService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_WRITE)
  @ApiOperation({
    summary: "Update a lead (rejected once the lead's status is ARCHIVED or CONVERTED)",
  })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('lead')
  @ApiConflictError('Changing the email would collide with another active lead for that email.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @Tenant() tenant: TenantContext,
  ): Promise<LeadResponseDto> {
    return this.leadService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_WRITE)
  @ApiOperation({
    summary: 'Archive a lead (terminal — an archived lead can no longer be updated or converted)',
  })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('lead')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArchiveLeadDto,
    @Tenant() tenant: TenantContext,
  ): Promise<LeadResponseDto> {
    return this.leadService.archive(id, dto, tenant.tenantId);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.LEADS_WRITE)
  @ApiOperation({
    summary: 'Convert a lead into a customer',
    description:
      'Terminal — creates (or links) a Customer record and records a LEAD_CONVERTED activity event.',
  })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('lead')
  @ApiConflictError(
    'A concurrent conversion already created a customer with this email — retry to link to the existing one.',
  )
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @Tenant() tenant: TenantContext,
  ): Promise<LeadResponseDto> {
    return this.leadService.convert(id, dto, tenant.tenantId);
  }
}
