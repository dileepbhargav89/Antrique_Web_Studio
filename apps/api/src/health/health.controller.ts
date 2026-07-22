import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResult } from './types/health-check-result.type';

// No JwtAuthGuard/PermissionsGuard — health checks are read by
// infrastructure (load balancers, Kubernetes probes), not authenticated
// users; the same "no guard, deliberately" treatment AuthController's own
// login/refresh/logout routes already get, for the same reason (nothing
// this controller returns is tenant- or user-scoped — see health.service.ts).
//
// `version: VERSION_NEUTRAL` + main.ts's own `setGlobalPrefix(..., {
// exclude: [...] })` together keep every route here at a stable,
// unprefixed, unversioned path (`/health/live`, not `/api/v1/health/live`)
// — matching HEALTH_PATH's own already-validated default (`/health`,
// env.validation.ts) and the real-world constraint that infrastructure
// config (a load balancer's health-check path) shouldn't need updating on
// every API version bump.
//
// `@SkipThrottle()` — Milestone 13's own global ThrottlerGuard would
// otherwise rate-limit exactly the traffic pattern a health check
// legitimately produces (an orchestrator polling every few seconds from
// one source), which could turn "temporarily slow" into "looks down to
// the load balancer" for the wrong reason.
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Liveness probe — is the process itself responsive? (no dependency checks, unauthenticated)',
  })
  live(): HealthCheckResult {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe — can this instance serve traffic right now? (checks the database)',
  })
  @ApiResponse({ status: 503, description: 'The database is unreachable from this instance.' })
  async ready(): Promise<HealthCheckResult> {
    const result = await this.healthService.checkReadiness();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @Get('startup')
  @ApiOperation({
    summary: 'Startup probe — has this instance finished initializing? (same check as readiness)',
  })
  @ApiResponse({ status: 503, description: 'The database is unreachable from this instance.' })
  async startup(): Promise<HealthCheckResult> {
    const result = await this.healthService.checkStartup();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
