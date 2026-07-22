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
import { TAX_RATE_ROUTE } from './constants/billing.constant';
import { TaxService } from './tax.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TaxRateListQueryDto } from './dto/tax-rate-list-query.dto';
import { TaxRateResponseDto } from './dto/tax-rate-response.dto';
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
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Tax" Controllers list: "CRUD."
@ApiTags('Tax Rate')
@ApiBearerAuth('bearer')
@Controller(TAX_RATE_ROUTE)
export class TaxRateController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TAX_RATES_WRITE)
  @ApiOperation({ summary: 'Create a tax rate' })
  @ApiCreatedResponse({ type: TaxRateResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateTaxRateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<TaxRateResponseDto> {
    return this.taxService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TAX_RATES_READ)
  @ApiOperation({ summary: 'List tax rates (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(TaxRateResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: TaxRateListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<TaxRateResponseDto>> {
    return this.taxService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TAX_RATES_READ)
  @ApiOperation({ summary: 'Get a tax rate by id' })
  @ApiOkResponse({ type: TaxRateResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('tax rate')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<TaxRateResponseDto> {
    return this.taxService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TAX_RATES_WRITE)
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiOkResponse({ type: TaxRateResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('tax rate')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaxRateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<TaxRateResponseDto> {
    return this.taxService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TAX_RATES_DELETE)
  @ApiOperation({ summary: 'Soft-delete a tax rate' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('tax rate')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.taxService.remove(id, tenant.tenantId);
  }
}
