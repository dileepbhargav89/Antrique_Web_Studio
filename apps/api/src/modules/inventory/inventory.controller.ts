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
import { INVENTORY_ROUTE } from './constants/inventory.constant';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryItemListQueryDto } from './dto/inventory-item-list-query.dto';
import { InventoryTransactionListQueryDto } from './dto/inventory-transaction-list-query.dto';
import { InventoryItemResponseDto } from './dto/inventory-item-response.dto';
import { InventoryTransactionResponseDto } from './dto/inventory-transaction-response.dto';
import { InventoryReservationResponseDto } from './dto/inventory-reservation-response.dto';
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

// No plain POST /inventory (create) or DELETE — this milestone's own
// "Controllers" list for Inventory is domain-specific operations only:
// Get stock, Adjust stock, Receive stock, Reserve stock, Release
// reservation, List transactions. An InventoryItem is only ever created
// implicitly, as a side effect of its first `receive`.
//
// Route order matters here: `GET /inventory/transactions` MUST be
// declared before `GET /inventory/:id` — Nest matches routes on the same
// HTTP verb in declaration order, and `:id` would otherwise greedily
// swallow "transactions" as a param value.
@ApiTags('Inventory')
@ApiBearerAuth('bearer')
@Controller(INVENTORY_ROUTE)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_READ)
  @ApiOperation({
    summary: 'List inventory items (stock on hand/reserved, paginated, filterable, sortable)',
  })
  @ApiPaginatedResponse(InventoryItemResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: InventoryItemListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<InventoryItemResponseDto>> {
    return this.inventoryService.listStock(query, tenant.tenantId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_READ)
  @ApiOperation({ summary: 'List inventory transactions — the append-only stock movement ledger' })
  @ApiPaginatedResponse(InventoryTransactionResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  listTransactions(
    @Query() query: InventoryTransactionListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<InventoryTransactionResponseDto>> {
    return this.inventoryService.listTransactions(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_READ)
  @ApiOperation({ summary: 'Get an inventory item by id' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('inventory item')
  getStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<InventoryItemResponseDto> {
    return this.inventoryService.getStock(id, tenant.tenantId);
  }

  @Post('receive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_WRITE)
  @ApiOperation({
    summary: 'Receive stock for a product variant at a warehouse',
    description:
      'Increases on-hand quantity and records a transaction. Creates the InventoryItem row on the first ' +
      'receipt for a given variant + warehouse (find-or-create) — every subsequent receipt updates it.',
  })
  @ApiCreatedResponse({ type: InventoryItemResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('This receipt would violate an inventory constraint.')
  receiveStock(
    @Body() dto: ReceiveStockDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InventoryItemResponseDto> {
    return this.inventoryService.receiveStock(dto, tenant.tenantId);
  }

  // @HttpCode(OK) on adjust/reserve/release — none of the three creates a
  // new top-level resource (unlike `receive`, which legitimately can via
  // find-or-create), each mutates an existing InventoryItem/reservation
  // and returns its new state, so Nest's default 201 for POST would be
  // the wrong status.
  @Post(':id/adjust')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_WRITE)
  @ApiOperation({
    summary: "Adjust an inventory item's on-hand quantity (correction, damage, count, etc.)",
  })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('inventory item')
  @ApiConflictError(
    'This adjustment would violate an inventory constraint (e.g. negative on-hand quantity).',
  )
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InventoryItemResponseDto> {
    return this.inventoryService.adjustStock(id, dto, tenant.tenantId);
  }

  @Post(':id/reserve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Reserve stock from an inventory item (e.g. for an in-progress order)' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('inventory item')
  @ApiConflictError(
    'This reservation would violate an inventory constraint (would exceed on-hand quantity).',
  )
  reserveStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveStockDto,
    @Tenant() tenant: TenantContext,
  ): Promise<InventoryItemResponseDto> {
    return this.inventoryService.reserveStock(id, dto, tenant.tenantId);
  }

  @Post('reservations/:reservationId/release')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.INVENTORY_WRITE)
  @ApiOperation({
    summary: 'Release a previously-made stock reservation, returning it to available on-hand',
  })
  @ApiOkResponse({ type: InventoryReservationResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('reservation')
  releaseReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<InventoryReservationResponseDto> {
    return this.inventoryService.releaseReservation(reservationId, tenant.tenantId);
  }
}
