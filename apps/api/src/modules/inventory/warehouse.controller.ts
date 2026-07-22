import {
  Body,
  Controller,
  Delete,
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
import { WAREHOUSE_ROUTE } from './constants/inventory.constant';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseListQueryDto } from './dto/warehouse-list-query.dto';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';
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
  ApiNoContentResponse,
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

// Thin controller — route + delegate only, all real work lives in
// WarehouseService. Same guard/permission shape as every prior module's
// own simple-CRUD controller (catalog's CategoryController, bespoke's
// FabricController).
@ApiTags('Warehouse')
@ApiBearerAuth('bearer')
@Controller(WAREHOUSE_ROUTE)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.WAREHOUSES_WRITE)
  @ApiOperation({ summary: 'Create a warehouse' })
  @ApiCreatedResponse({ type: WarehouseResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A warehouse with this code already exists in the tenant.')
  create(
    @Body() dto: CreateWarehouseDto,
    @Tenant() tenant: TenantContext,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.WAREHOUSES_READ)
  @ApiOperation({ summary: 'List warehouses (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(WarehouseResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: WarehouseListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<WarehouseResponseDto>> {
    return this.warehouseService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.WAREHOUSES_READ)
  @ApiOperation({ summary: 'Get a warehouse by id' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('warehouse')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.WAREHOUSES_WRITE)
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('warehouse')
  @ApiConflictError('A warehouse with this code already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
    @Tenant() tenant: TenantContext,
  ): Promise<WarehouseResponseDto> {
    return this.warehouseService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.WAREHOUSES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a warehouse' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('warehouse')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.warehouseService.remove(id, tenant.tenantId);
  }
}
