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
import { PRODUCT_CUSTOMIZATION_ROUTE } from './constants/bespoke.constant';
import { ProductCustomizationService } from './product-customization.service';
import { CreateProductCustomizationDto } from './dto/create-product-customization.dto';
import { UpdateProductCustomizationDto } from './dto/update-product-customization.dto';
import { ProductCustomizationListQueryDto } from './dto/product-customization-list-query.dto';
import { ProductCustomizationResponseDto } from './dto/product-customization-response.dto';
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

// No @Delete route — this milestone's own "Controllers" section lists
// Create/Update/Get/List only for Product Customization.
@ApiTags('Product Customization')
@ApiBearerAuth('bearer')
@Controller(PRODUCT_CUSTOMIZATION_ROUTE)
export class ProductCustomizationController {
  constructor(private readonly productCustomizationService: ProductCustomizationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCT_CUSTOMIZATIONS_WRITE)
  @ApiOperation({
    summary: 'Create a product customization (style groups, pricing adjustments, monogram options)',
  })
  @ApiCreatedResponse({ type: ProductCustomizationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError(
    'This product already has a customization (one-to-one — use PATCH to modify it instead).',
  )
  create(
    @Body() dto: CreateProductCustomizationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductCustomizationResponseDto> {
    return this.productCustomizationService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCT_CUSTOMIZATIONS_READ)
  @ApiOperation({ summary: 'List product customizations (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ProductCustomizationResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ProductCustomizationListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ProductCustomizationResponseDto>> {
    return this.productCustomizationService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCT_CUSTOMIZATIONS_READ)
  @ApiOperation({ summary: 'Get a product customization by id' })
  @ApiOkResponse({ type: ProductCustomizationResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('product customization')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductCustomizationResponseDto> {
    return this.productCustomizationService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCT_CUSTOMIZATIONS_WRITE)
  @ApiOperation({ summary: 'Update a product customization' })
  @ApiOkResponse({ type: ProductCustomizationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('product customization')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCustomizationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductCustomizationResponseDto> {
    return this.productCustomizationService.update(id, dto, tenant.tenantId);
  }
}
