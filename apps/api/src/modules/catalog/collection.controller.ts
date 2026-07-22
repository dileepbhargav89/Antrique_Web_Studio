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
import { COLLECTION_ROUTE } from './constants/catalog.constant';
import { CollectionService } from './collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionListQueryDto } from './dto/collection-list-query.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
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

// Same shape as category.controller.ts — see that file's own comment for
// the full RBAC/tenant-scoping reasoning.
@ApiTags('Collection')
@ApiBearerAuth('bearer')
@Controller(COLLECTION_ROUTE)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COLLECTIONS_WRITE)
  @ApiOperation({ summary: 'Create a collection' })
  @ApiCreatedResponse({ type: CollectionResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A collection with this slug already exists in the tenant.')
  create(
    @Body() dto: CreateCollectionDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COLLECTIONS_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'List collections (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(CollectionResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CollectionListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CollectionResponseDto>> {
    return this.collectionService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COLLECTIONS_READ)
  @CacheControl(CATALOG_READ_CACHE_MAX_AGE_SECONDS)
  @ApiOperation({ summary: 'Get a collection by id' })
  @ApiOkResponse({ type: CollectionResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('collection')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COLLECTIONS_WRITE)
  @ApiOperation({ summary: 'Update a collection' })
  @ApiOkResponse({ type: CollectionResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('collection')
  @ApiConflictError('A collection with this slug already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CollectionResponseDto> {
    return this.collectionService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COLLECTIONS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a collection' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('collection')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.collectionService.remove(id, tenant.tenantId);
  }
}
