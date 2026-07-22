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
import { MEASUREMENT_PROFILE_ROUTE } from './constants/bespoke.constant';
import { MeasurementService } from './measurement.service';
import { CreateMeasurementProfileDto } from './dto/create-measurement-profile.dto';
import { UpdateMeasurementProfileDto } from './dto/update-measurement-profile.dto';
import { MeasurementProfileListQueryDto } from './dto/measurement-profile-list-query.dto';
import { MeasurementProfileResponseDto } from './dto/measurement-profile-response.dto';
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

// Route named "Measurement Profiles" (this milestone's own controller
// list) even though the injected service class is `MeasurementService` /
// backing repository `MeasurementRepository` — see
// measurement.repository.ts's own header comment for why the naming
// differs between layers.
@ApiTags('Measurement Profile')
@ApiBearerAuth('bearer')
@Controller(MEASUREMENT_PROFILE_ROUTE)
export class MeasurementProfileController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MEASUREMENT_PROFILES_WRITE)
  @ApiOperation({ summary: 'Create a measurement profile (with its measurements)' })
  @ApiCreatedResponse({ type: MeasurementProfileResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateMeasurementProfileDto,
    @Tenant() tenant: TenantContext,
  ): Promise<MeasurementProfileResponseDto> {
    return this.measurementService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MEASUREMENT_PROFILES_READ)
  @ApiOperation({ summary: 'List measurement profiles (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(MeasurementProfileResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: MeasurementProfileListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<MeasurementProfileResponseDto>> {
    return this.measurementService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MEASUREMENT_PROFILES_READ)
  @ApiOperation({ summary: 'Get a measurement profile by id' })
  @ApiOkResponse({ type: MeasurementProfileResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('measurement profile')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<MeasurementProfileResponseDto> {
    return this.measurementService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MEASUREMENT_PROFILES_WRITE)
  @ApiOperation({
    summary: 'Update a measurement profile (replaces its measurements, if provided)',
  })
  @ApiOkResponse({ type: MeasurementProfileResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('measurement profile')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeasurementProfileDto,
    @Tenant() tenant: TenantContext,
  ): Promise<MeasurementProfileResponseDto> {
    return this.measurementService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MEASUREMENT_PROFILES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a measurement profile' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('measurement profile')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.measurementService.remove(id, tenant.tenantId);
  }
}
