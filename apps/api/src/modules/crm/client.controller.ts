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
import { CLIENT_ROUTE } from './constants/crm.constant';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientListQueryDto } from './dto/client-list-query.dto';
import { ClientResponseDto } from './dto/client-response.dto';
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

// The agency's customer-organization profile — Create/List/Get/Update
// only, no Delete (no `clients:delete` permission is seeded; moving to
// INACTIVE/ARCHIVED happens via PATCH's own `status` field, not a
// dedicated action route — see client.service.ts's own comment).
@ApiTags('Client')
@ApiBearerAuth('bearer')
@Controller(CLIENT_ROUTE)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CLIENTS_WRITE)
  @ApiOperation({ summary: 'Create a client' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateClientDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ClientResponseDto> {
    return this.clientService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CLIENTS_READ)
  @ApiOperation({ summary: 'List clients (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ClientResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ClientListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ClientResponseDto>> {
    return this.clientService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CLIENTS_READ)
  @ApiOperation({ summary: 'Get a client by id' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('client')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ClientResponseDto> {
    return this.clientService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CLIENTS_WRITE)
  @ApiOperation({
    summary: 'Update a client, including status (ACTIVE/INACTIVE/ARCHIVED)',
  })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('client')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ClientResponseDto> {
    return this.clientService.update(id, dto, tenant.tenantId);
  }
}
