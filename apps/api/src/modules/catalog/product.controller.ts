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
import { PRODUCT_ROUTE } from './constants/catalog.constant';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import { CacheControl } from '../../common/decorators/cache-control.decorator';
import { CATALOG_READ_CACHE_MAX_AGE_SECONDS } from './constants/catalog.constant';
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

// Same shape as category.controller.ts/collection.controller.ts — see
// category.controller.ts's own comment for the full RBAC/tenant-scoping
// reasoning.
@ApiTags('Product')
@ApiBearerAuth('bearer')
@Controller(PRODUCT_ROUTE)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError(
    'A product with this slug (or a variant with this SKU) already exists in the tenant.',
  )
  create(
    @Body() dto: CreateProductDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductResponseDto> {
    return this.productService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'List products (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ProductResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ProductListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return this.productService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'Get a product by id (includes variants and images)' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('product')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductResponseDto> {
    return this.productService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Update a product' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('product')
  @ApiConflictError('A product with this slug already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('product')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.productService.remove(id, tenant.tenantId);
  }
}
