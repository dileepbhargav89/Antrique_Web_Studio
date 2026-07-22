import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardAuthErrors } from '../../common/decorators/api-standard-responses.decorator';
import { RUNTIME_ROUTE } from './constants/admin.constant';
import { RuntimeService } from './runtime.service';
import { RuntimeInfoResponseDto } from './dto/runtime-info-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSION } from '../auth/constants/permission.constant';

// Milestone 14 (Production Infrastructure) — "Expose runtime metadata
// endpoint (Admin only)." Gated under `system:read`, this milestone's own
// new "Admin, Super Admin" only tier (permission.constant.ts's own
// comment). System-level, not tenant-scoped — deliberately does not read
// `@Tenant()` (unlike every other AdminModule route), since version/
// uptime/database-connectivity are process-wide facts, not per-tenant
// data.
@ApiTags('Runtime')
@ApiBearerAuth('bearer')
@Controller(RUNTIME_ROUTE)
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SYSTEM_READ)
  @ApiOperation({
    summary:
      'Get runtime metadata — version, uptime, environment, database health (Admin/Super Admin only)',
  })
  @ApiOkResponse({ type: RuntimeInfoResponseDto })
  @ApiStandardAuthErrors()
  getRuntimeInfo(): Promise<RuntimeInfoResponseDto> {
    return this.runtimeService.getRuntimeInfo();
  }
}
