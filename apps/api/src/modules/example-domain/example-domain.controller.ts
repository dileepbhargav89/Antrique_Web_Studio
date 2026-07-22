import { Controller, Get, UseGuards } from '@nestjs/common';
import { EXAMPLE_DOMAIN_ROUTE } from './constants/example-domain.constant';
import { ExampleDomainService } from './example-domain.service';
import { PingResponseDto } from './dto/ping-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { Organization } from '../../common/decorators/organization.decorator';
import { RequestUser } from '../../types/request-user.type';
import { TenantContext } from '../../types/tenant-context.type';
import { OrganizationContext } from '../../types/organization-context.type';
import { ROLE } from '../auth/constants/role.constant';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

// Reference implementation — see example-domain.service.ts's header
// comment. Controllers stay thin: route + delegate only, all real work
// (however little exists here) lives in the service.
//
// `ping()` (Milestone 2, extended by Milestone 3 — Role & Permission
// Foundation) is now this codebase's one example of `JwtAuthGuard` +
// `RolesGuard` stacked on the same route: `@UseGuards(JwtAuthGuard,
// RolesGuard)` — array order is execution order, so JwtAuthGuard verifies
// the token and attaches `request.user` *before* RolesGuard ever runs
// (RolesGuard's own header comment explains why it trusts, rather than
// re-checks, this ordering). `@Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)` means
// either role is sufficient (OR semantics). `permissionPing()` (new,
// Milestone 3) is the matching example for `PermissionsGuard`:
// `@Permissions(PERMISSION.PROJECTS_WRITE)` requires that specific grant.
// Both reuse `ExampleDomainService.ping()`/`PingResponseDto` — the guard
// stacked on each route is the entire difference being demonstrated here,
// not the response shape. Every other route in this codebase
// (`/auth/login`, `/auth/refresh`, `/auth/logout`) remains unauthenticated,
// unchanged by this milestone.
@ApiTags('Example Domain')
@ApiBearerAuth('bearer')
@Controller(EXAMPLE_DOMAIN_ROUTE)
export class ExampleDomainController {
  constructor(private readonly exampleDomainService: ExampleDomainService) {}

  @Get('ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  ping(@CurrentUser() user: RequestUser): PingResponseDto {
    return this.exampleDomainService.ping(user.email);
  }

  @Get('permission-ping')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_WRITE)
  permissionPing(@CurrentUser() user: RequestUser): PingResponseDto {
    return this.exampleDomainService.ping(user.email);
  }

  // Milestone 4 (Organization & Multi-Tenant Foundation) — the reference
  // endpoint for `@Tenant()`/`@Organization()`. Protected by
  // `JwtAuthGuard` only (this milestone's own explicit ask — no
  // `RolesGuard`/`PermissionsGuard` here, unlike `ping()`/
  // `permissionPing()`): demonstrating tenant resolution doesn't need an
  // RBAC check layered on top of it. `@Tenant()`/`@Organization()` both
  // resolve on this route regardless of the guard, the same way they
  // resolve on the *unguarded* `POST /auth/login` — `TenantMiddleware`
  // runs application-wide, independent of any per-route guard.
  @Get('organization')
  @UseGuards(JwtAuthGuard)
  organization(
    @Tenant() tenant: TenantContext,
    @Organization() organization: OrganizationContext,
  ): OrganizationResponseDto {
    return this.exampleDomainService.organization(tenant.tenantId, organization);
  }
}
