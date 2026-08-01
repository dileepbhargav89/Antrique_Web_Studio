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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { QUOTATION_ROUTE } from './constants/crm.constant';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { RejectQuotationDto } from './dto/reject-quotation.dto';
import { QuotationListQueryDto } from './dto/quotation-list-query.dto';
import { QuotationResponseDto } from './dto/quotation-response.dto';
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

// "Proposal Management" (Phase 7) — built on the existing `Quotation`
// model (no separate Proposal model exists — see quotation.service.ts's
// own header comment). Create/List/Get/Update (DRAFT only) plus 3
// terminal action routes (Send/Accept/Reject), same POST-action-route
// shape InvoiceController's own Issue/Void already establishes.
@ApiTags('Quotation')
@ApiBearerAuth('bearer')
@Controller(QUOTATION_ROUTE)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({ summary: 'Create a draft quotation (proposal) for a lead or client' })
  @ApiCreatedResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError(
    'Could not generate a unique quotation number after retrying — safe to retry the request.',
  )
  create(
    @Body() dto: CreateQuotationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_READ)
  @ApiOperation({ summary: 'List quotations (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(QuotationResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: QuotationListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<QuotationResponseDto>> {
    return this.quotationService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_READ)
  @ApiOperation({ summary: 'Get a quotation by id' })
  @ApiOkResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('quotation')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.findById(id, tenant.tenantId);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_READ)
  @ApiOperation({
    summary: 'Render a DRAFT quotation to PDF without sending it',
    description:
      'Streams the same PDF `POST /:id/send` would produce, with none of that route’s side ' +
      'effects (no storage upload, no status change, no email) — lets a draft be checked before ' +
      'it becomes terminal. DRAFT only; SENT+ quotations already have a real, immutable pdfUrl.',
  })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('quotation')
  async preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.quotationService.preview(id, tenant.tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
    });
    res.send(pdf);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({ summary: 'Update a draft quotation (only DRAFT quotations can be updated)' })
  @ApiOkResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('quotation')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({
    summary: 'Send a draft quotation (DRAFT → SENT)',
    description:
      'Generates a PDF (stored via object storage) and emails it to the lead/client, if either ' +
      'has a resolvable email address. The email send is fire-and-forget — a slow/down provider ' +
      'never delays or fails this response; the returned pdfUrl is always real.',
  })
  @ApiOkResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('quotation')
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.send(id, tenant.tenantId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({ summary: 'Accept a sent quotation (SENT → ACCEPTED, terminal)' })
  @ApiOkResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('quotation')
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.accept(id, tenant.tenantId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({ summary: 'Reject a sent quotation (SENT → REJECTED, terminal)' })
  @ApiOkResponse({ type: QuotationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('quotation')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectQuotationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.reject(id, dto, tenant.tenantId);
  }
}
