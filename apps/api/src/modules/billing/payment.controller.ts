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
import { PAYMENT_ROUTE } from './constants/billing.constant';
import { PaymentService } from './payment.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AllocatePaymentDto } from './dto/allocate-payment.dto';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Payments" Controllers list: Record, Allocate,
// Refund placeholder, Get, List — no Update/Delete, `Payment` is
// append-only (see payment.service.ts's own header comment).
@ApiTags('Payment')
@ApiBearerAuth('bearer')
@Controller(PAYMENT_ROUTE)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'Record a payment' })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  record(
    @Body() dto: RecordPaymentDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.record(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PAYMENTS_READ)
  @ApiOperation({ summary: 'List payments (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(PaymentResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: PaymentListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    return this.paymentService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PAYMENTS_READ)
  @ApiOperation({ summary: 'Get a payment by id' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('payment')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.findById(id, tenant.tenantId);
  }

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PAYMENTS_WRITE)
  @ApiOperation({ summary: 'Allocate a payment against one or more invoices' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('payment')
  allocate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocatePaymentDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.allocate(id, dto, tenant.tenantId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PAYMENTS_REFUND)
  @ApiOperation({
    summary: 'Refund a payment (placeholder — not yet implemented; always throws)',
    description:
      "Admin-only (`payments:refund`). Real refund processing (hosted-gateway integration) doesn't exist " +
      'yet — this route exists to reserve the permission tier and route shape ahead of that work.',
  })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('payment')
  @ApiResponse({
    status: 501,
    description: 'Always returned — refund processing is not implemented yet.',
  })
  refund(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<never> {
    return this.paymentService.refundPlaceholder(id, tenant.tenantId);
  }
}
