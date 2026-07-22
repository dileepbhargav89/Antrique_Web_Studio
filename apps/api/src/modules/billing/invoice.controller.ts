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
import { INVOICE_ROUTE } from './constants/billing.constant';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoiceListQueryDto } from './dto/invoice-list-query.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
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

// This milestone's own "Invoices" Controllers list: Create, Issue, Void,
// Get, List — plus `PATCH` (Update draft invoice, a named Service
// responsibility not literally listed as a Controller action — see
// invoice.service.ts's own comment and docs/implementation/decisions.md).
@ApiTags('Invoice')
@ApiBearerAuth('bearer')
@Controller(INVOICE_ROUTE)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_WRITE)
  @ApiOperation({ summary: 'Create a draft invoice from an existing order' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError(
    'Could not generate a unique invoice number after retrying — safe to retry the request.',
  )
  create(
    @Body() dto: CreateInvoiceDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.createFromOrder(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_READ)
  @ApiOperation({ summary: 'List invoices (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(InvoiceResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: InvoiceListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    return this.invoiceService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_READ)
  @ApiOperation({ summary: 'Get an invoice by id' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('invoice')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_WRITE)
  @ApiOperation({ summary: 'Update a draft invoice (only DRAFT invoices can be updated)' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('invoice')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_WRITE)
  @ApiOperation({ summary: 'Issue a draft invoice (DRAFT → ISSUED, no longer editable via PATCH)' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('invoice')
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.issue(id, tenant.tenantId);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVOICES_VOID)
  @ApiOperation({
    summary: 'Void an issued invoice',
    description:
      'Admin-only (`invoices:void`) — stricter than the Manager+ `invoices:write` tier other writes use.',
  })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('invoice')
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.void(id, dto, tenant.tenantId);
  }
}
