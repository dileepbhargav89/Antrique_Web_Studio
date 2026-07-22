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
import { CATEGORY_ROUTE } from './constants/catalog.constant';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
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

// Thin controller — route + delegate only, all real work lives in
// CategoryService. Every route is `JwtAuthGuard` + `PermissionsGuard`
// (Milestone 5's own "Use the existing RolesGuard and PermissionsGuard" —
// PermissionsGuard chosen here: the brief's read/write/delete tiers map
// 1:1 onto `categories:read`/`categories:write`/`categories:delete`, the
// existing resource:action permission-key convention every other
// business domain in this catalog already uses, rather than hardcoding
// three different role-name lists across nine controller methods across
// three controllers — see docs/implementation/decisions.md).
// `@Tenant()` (Milestone 4) supplies `tenantId` to every service call —
// "never trust client-supplied tenant identifiers" (this milestone's own
// requirement): the resolved `TenantContext`, not anything from the
// request body/params, is what scopes every query.
@ApiTags('Category')
@ApiBearerAuth('bearer')
@Controller(CATEGORY_ROUTE)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CATEGORIES_WRITE)
  @ApiOperation({ summary: 'Create a category' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A category with this slug already exists in the tenant.')
  create(
    @Body() dto: CreateCategoryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CATEGORIES_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'List categories (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(CategoryResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CategoryListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return this.categoryService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CATEGORIES_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('category')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CATEGORIES_WRITE)
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('category')
  @ApiConflictError('A category with this slug already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CATEGORIES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a category' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('category')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.categoryService.remove(id, tenant.tenantId);
  }
}
