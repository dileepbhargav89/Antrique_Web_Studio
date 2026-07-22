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
import { CUSTOMER_TAG_ROUTE } from './constants/crm.constant';
import { CustomerTagService } from './customer-tag.service';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';
import { CustomerTagListQueryDto } from './dto/customer-tag-list-query.dto';
import { CustomerTagResponseDto } from './dto/customer-tag-response.dto';
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

// NOT named in this milestone's own "Controllers" list — added so
// `CustomerTag`/`CustomerTagAssignment` (this milestone's own named
// "Core entities") and the "Tags" list filter have a real write path;
// see CustomerTagRepository's own header comment and
// docs/implementation/decisions.md.
@ApiTags('Customer Tag')
@ApiBearerAuth('bearer')
@Controller(CUSTOMER_TAG_ROUTE)
export class CustomerTagController {
  constructor(private readonly customerTagService: CustomerTagService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_WRITE)
  @ApiOperation({ summary: 'Create a customer tag' })
  @ApiCreatedResponse({ type: CustomerTagResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A customer tag with this slug already exists in the tenant.')
  create(
    @Body() dto: CreateCustomerTagDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerTagResponseDto> {
    return this.customerTagService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_READ)
  @ApiOperation({ summary: 'List customer tags (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(CustomerTagResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CustomerTagListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CustomerTagResponseDto>> {
    return this.customerTagService.list(query, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_WRITE)
  @ApiOperation({ summary: 'Update a customer tag' })
  @ApiOkResponse({ type: CustomerTagResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('customer tag')
  @ApiConflictError('A customer tag with this slug already exists in the tenant.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerTagDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerTagResponseDto> {
    return this.customerTagService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_DELETE)
  @ApiOperation({ summary: 'Soft-delete a customer tag' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('customer tag')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.customerTagService.remove(id, tenant.tenantId);
  }

  @Post(':id/customers/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_WRITE)
  @ApiOperation({ summary: 'Assign a tag to a customer' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('tag or customer')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<void> {
    return this.customerTagService.assign(id, customerId, tenant.tenantId);
  }

  @Delete(':id/customers/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_TAGS_WRITE)
  @ApiOperation({ summary: 'Remove a tag from a customer' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('tag or customer')
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<void> {
    return this.customerTagService.unassign(id, customerId, tenant.tenantId);
  }
}
