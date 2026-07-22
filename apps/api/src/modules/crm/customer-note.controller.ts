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
import { CUSTOMER_NOTE_ROUTE } from './constants/crm.constant';
import { CustomerNoteService } from './customer-note.service';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { UpdateCustomerNoteDto } from './dto/update-customer-note.dto';
import { CustomerNoteListQueryDto } from './dto/customer-note-list-query.dto';
import { CustomerNoteResponseDto } from './dto/customer-note-response.dto';
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

// This milestone's own "Notes" Controllers list: "CRUD" — the `DELETE`
// route here always resolves to a soft-delete ("Notes never hard-
// delete," see CustomerNoteService.remove()), same as every other
// module's own DELETE route that fronts a soft-delete.
@ApiTags('Customer Note')
@ApiBearerAuth('bearer')
@Controller(CUSTOMER_NOTE_ROUTE)
export class CustomerNoteController {
  constructor(private readonly customerNoteService: CustomerNoteService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_NOTES_WRITE)
  @ApiOperation({ summary: 'Create a customer note' })
  @ApiCreatedResponse({ type: CustomerNoteResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateCustomerNoteDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerNoteResponseDto> {
    return this.customerNoteService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_NOTES_READ)
  @ApiOperation({ summary: 'List customer notes (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(CustomerNoteResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CustomerNoteListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CustomerNoteResponseDto>> {
    return this.customerNoteService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_NOTES_READ)
  @ApiOperation({ summary: 'Get a customer note by id' })
  @ApiOkResponse({ type: CustomerNoteResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('customer note')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerNoteResponseDto> {
    return this.customerNoteService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_NOTES_WRITE)
  @ApiOperation({ summary: 'Update a customer note' })
  @ApiOkResponse({ type: CustomerNoteResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('customer note')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerNoteDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerNoteResponseDto> {
    return this.customerNoteService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_NOTES_DELETE)
  @ApiOperation({ summary: 'Soft-delete a customer note' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('customer note')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.customerNoteService.remove(id, tenant.tenantId);
  }
}
