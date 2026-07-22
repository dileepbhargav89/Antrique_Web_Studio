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
import { STYLE_OPTION_ROUTE } from './constants/bespoke.constant';
import { StyleOptionService } from './style-option.service';
import { CreateStyleOptionDto } from './dto/create-style-option.dto';
import { UpdateStyleOptionDto } from './dto/update-style-option.dto';
import { StyleOptionListQueryDto } from './dto/style-option-list-query.dto';
import { StyleOptionResponseDto } from './dto/style-option-response.dto';
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

@ApiTags('Style Option')
@ApiBearerAuth('bearer')
@Controller(STYLE_OPTION_ROUTE)
export class StyleOptionController {
  constructor(private readonly styleOptionService: StyleOptionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.STYLE_OPTIONS_WRITE)
  @ApiOperation({ summary: 'Create a style option' })
  @ApiCreatedResponse({ type: StyleOptionResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A style option with this name already exists in the tenant.')
  create(
    @Body() dto: CreateStyleOptionDto,
    @Tenant() tenant: TenantContext,
  ): Promise<StyleOptionResponseDto> {
    return this.styleOptionService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.STYLE_OPTIONS_READ)
  @ApiOperation({ summary: 'List style options (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(StyleOptionResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: StyleOptionListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<StyleOptionResponseDto>> {
    return this.styleOptionService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.STYLE_OPTIONS_READ)
  @ApiOperation({ summary: 'Get a style option by id' })
  @ApiOkResponse({ type: StyleOptionResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('style option')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<StyleOptionResponseDto> {
    return this.styleOptionService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.STYLE_OPTIONS_WRITE)
  @ApiOperation({ summary: 'Update a style option' })
  @ApiOkResponse({ type: StyleOptionResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('style option')
  @ApiConflictError('A style option with this name already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStyleOptionDto,
    @Tenant() tenant: TenantContext,
  ): Promise<StyleOptionResponseDto> {
    return this.styleOptionService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.STYLE_OPTIONS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a style option' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('style option')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.styleOptionService.remove(id, tenant.tenantId);
  }
}
