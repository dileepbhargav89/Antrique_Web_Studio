import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiValidationError } from '../../common/decorators/api-standard-responses.decorator';
import { AUTH_ROUTE, LOGIN_THROTTLE_LIMIT, LOGIN_THROTTLE_TTL_MS } from './constants/auth.constant';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';

// Thin controller — route + delegate only, all real work (however
// little exists today) lives in AuthService. See auth.service.ts's
// header comment for what this phase does and does not implement.
// @HttpCode(200) on every route: Nest's default for @Post() is 201
// Created, correct for routes that create a resource — none of these
// do (login/refresh don't create anything the client models as a
// resource; logout destroys, if anything), so the default would be
// semantically wrong even for a placeholder response.
//
// `login()` reads `@Tenant()` (Milestone 4 — Organization &
// Multi-Tenant Foundation), the request's already-resolved
// `TenantContext` (`TenantMiddleware` runs for every request, guarded or
// not, so it's always populated by the time this controller runs) — not
// `@Req()`, matching this codebase's established "decorator over raw
// request access" convention (`@CurrentUser()`). `refresh()`/`logout()`
// deliberately do NOT take a tenant: `refresh()` never looks up a user
// by email (it only verifies/reissues a JWT), and `logout()` is still a
// placeholder — neither needs tenant scoping, and this milestone's own
// brief scopes the AuthRepository change to "login lookup" specifically.
// No @ApiBearerAuth() — every route on this controller is deliberately
// unauthenticated (see this class's own header comment); the Swagger
// "Authorize" button has nothing to apply here.
@ApiTags('Auth')
@Controller(AUTH_ROUTE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Milestone 13 (Security Hardening) — "authentication rate limiting,
  // login throttling." A stricter override of the app-wide default
  // throttler profile (ThrottlerModule.forRootAsync(), app.module.ts) —
  // credential-stuffing/brute-force resistance needs a much tighter
  // budget than ordinary API traffic. Hardcoded, not env-configurable
  // like the general rate limit: this is a fixed security policy
  // decision (a defensible "5 attempts per minute, per client IP" is not
  // something a deployment should legitimately need to loosen), not a
  // capacity/traffic tuning knob the way the general limit is.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL_MS } })
  @ApiOperation({
    summary: 'Log in with email + password',
    description:
      'Issues a short-lived access token and a longer-lived refresh token for the resolved tenant. ' +
      `Rate-limited to ${LOGIN_THROTTLE_LIMIT} attempts per client per minute, independent of the ` +
      'app-wide rate limit.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Email/password combination is not valid for this tenant.',
  })
  @ApiValidationError()
  login(@Body() dto: LoginRequestDto, @Tenant() tenant: TenantContext): Promise<LoginResponseDto> {
    return this.authService.login(dto, tenant);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access + refresh token pair',
  })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is missing, malformed, expired, or invalid.',
  })
  @ApiValidationError()
  refresh(@Body() dto: RefreshRequestDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out (placeholder — no server-side session/token state exists to invalidate yet)',
  })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(): Promise<LogoutResponseDto> {
    return this.authService.logout();
  }
}
