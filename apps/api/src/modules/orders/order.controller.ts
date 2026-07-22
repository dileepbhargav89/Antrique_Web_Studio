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
import { ORDER_ROUTE } from './constants/orders.constant';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
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
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Controllers" list: Create, Update, Cancel, Get,
// List, Change status — no plain Delete (Order has no delete endpoint at
// all; cancellation is the terminal write action, gated by its own,
// stricter `orders:cancel` permission — Admin+ only, unlike
// Create/Update/Change status, which are Manager+ via `orders:write`).
@ApiTags('Order')
@ApiBearerAuth('bearer')
@Controller(ORDER_ROUTE)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_WRITE)
  @ApiOperation({
    summary: 'Create an order',
    description:
      'Validates every line item (variant, bespoke customization, inventory availability), computes ' +
      'pricing, reserves stock, and creates the order atomically in one transaction.',
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(@Body() dto: CreateOrderDto, @Tenant() tenant: TenantContext): Promise<OrderResponseDto> {
    return this.orderService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_READ)
  @ApiOperation({ summary: 'List orders (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(OrderResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: OrderListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return this.orderService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_READ)
  @ApiOperation({ summary: 'Get an order by id (includes line items and status history)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('order')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<OrderResponseDto> {
    return this.orderService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_WRITE)
  @ApiOperation({ summary: "Update an order's own fields (not its status — see POST :id/status)" })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('order')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
    @Tenant() tenant: TenantContext,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_WRITE)
  @ApiOperation({
    summary: 'Transition an order to its next status (enforces the allowed status sequence)',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('order')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrderStatusDto,
    @Tenant() tenant: TenantContext,
  ): Promise<OrderResponseDto> {
    return this.orderService.changeStatus(id, dto, tenant.tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.ORDERS_CANCEL)
  @ApiOperation({
    summary: 'Cancel an order and release its reserved stock',
    description:
      'Admin-only (`orders:cancel`) — stricter than the Manager+ `orders:write` tier other writes use.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('order')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @Tenant() tenant: TenantContext,
  ): Promise<OrderResponseDto> {
    return this.orderService.cancel(id, dto, tenant.tenantId);
  }
}
