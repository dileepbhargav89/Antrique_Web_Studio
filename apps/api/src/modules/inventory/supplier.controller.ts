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
import { SUPPLIER_ROUTE } from './constants/inventory.constant';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierListQueryDto } from './dto/supplier-list-query.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
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

@ApiTags('Supplier')
@ApiBearerAuth('bearer')
@Controller(SUPPLIER_ROUTE)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SUPPLIERS_WRITE)
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiCreatedResponse({ type: SupplierResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A supplier with this name already exists in the tenant.')
  create(
    @Body() dto: CreateSupplierDto,
    @Tenant() tenant: TenantContext,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SUPPLIERS_READ)
  @ApiOperation({ summary: 'List suppliers (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(SupplierResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: SupplierListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    return this.supplierService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SUPPLIERS_READ)
  @ApiOperation({ summary: 'Get a supplier by id' })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('supplier')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SUPPLIERS_WRITE)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('supplier')
  @ApiConflictError('A supplier with this name already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @Tenant() tenant: TenantContext,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SUPPLIERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('supplier')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.supplierService.remove(id, tenant.tenantId);
  }
}
