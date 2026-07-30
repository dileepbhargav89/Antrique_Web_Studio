import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VENDOR_ROUTE } from './constants/finance.constant';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorListQueryDto } from './dto/vendor-list-query.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
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

// Who the agency pays for goods/services — Create/List/Get/Update only,
// no Delete (no `vendors:delete` permission is seeded; moving to
// INACTIVE/ARCHIVED happens via PATCH's own `status` field, same shape
// ClientController already establishes).
@ApiTags('Finance')
@ApiBearerAuth('bearer')
@Controller(VENDOR_ROUTE)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.VENDORS_WRITE)
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiCreatedResponse({ type: VendorResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateVendorDto,
    @Tenant() tenant: TenantContext,
  ): Promise<VendorResponseDto> {
    return this.vendorService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.VENDORS_READ)
  @ApiOperation({ summary: 'List vendors (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(VendorResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: VendorListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<VendorResponseDto>> {
    return this.vendorService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.VENDORS_READ)
  @ApiOperation({ summary: 'Get a vendor by id' })
  @ApiOkResponse({ type: VendorResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('vendor')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<VendorResponseDto> {
    return this.vendorService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.VENDORS_WRITE)
  @ApiOperation({
    summary: 'Update a vendor, including status (ACTIVE/INACTIVE/ARCHIVED)',
  })
  @ApiOkResponse({ type: VendorResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('vendor')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @Tenant() tenant: TenantContext,
  ): Promise<VendorResponseDto> {
    return this.vendorService.update(id, dto, tenant.tenantId);
  }
}
