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
import { FABRIC_ROUTE } from './constants/bespoke.constant';
import { FabricService } from './fabric.service';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';
import { FabricListQueryDto } from './dto/fabric-list-query.dto';
import { FabricResponseDto } from './dto/fabric-response.dto';
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
// FabricService. Same guard/permission shape as catalog's own
// CategoryController — see that file's own header comment for the full
// reasoning (PermissionsGuard, `@Tenant()` sourcing `tenantId`).
@ApiTags('Fabric')
@ApiBearerAuth('bearer')
@Controller(FABRIC_ROUTE)
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FABRICS_WRITE)
  @ApiOperation({ summary: 'Create a fabric' })
  @ApiCreatedResponse({ type: FabricResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A fabric with this name already exists in the tenant.')
  create(
    @Body() dto: CreateFabricDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FabricResponseDto> {
    return this.fabricService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FABRICS_READ)
  @ApiOperation({ summary: 'List fabrics (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(FabricResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: FabricListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<FabricResponseDto>> {
    return this.fabricService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FABRICS_READ)
  @ApiOperation({ summary: 'Get a fabric by id' })
  @ApiOkResponse({ type: FabricResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('fabric')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<FabricResponseDto> {
    return this.fabricService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FABRICS_WRITE)
  @ApiOperation({ summary: 'Update a fabric' })
  @ApiOkResponse({ type: FabricResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('fabric')
  @ApiConflictError('A fabric with this name already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFabricDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FabricResponseDto> {
    return this.fabricService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FABRICS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a fabric' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('fabric')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.fabricService.remove(id, tenant.tenantId);
  }
}
