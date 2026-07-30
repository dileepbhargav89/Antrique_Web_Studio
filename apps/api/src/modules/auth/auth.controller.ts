import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import {
  AUTH_ROUTE,
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
  REFRESH_THROTTLE_LIMIT,
  REFRESH_THROTTLE_TTL_MS,
} from './constants/auth.constant';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { RequestMetaDecorator } from '../../common/decorators/request-meta.decorator';
import { RequestMeta } from '../../types/request-meta.type';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../types/request-user.type';

// Thin controller — route + delegate only, all real work lives in
// AuthService. See auth.service.ts's header comment for what each
// route does.
// @HttpCode(200) on every POST: Nest's default for @Post() is 201
// Created, correct for routes that create a resource — none of these
// do in the sense a client models as a resource (login/refresh don't;
// logout revokes one).
//
// `login()`/`refresh()`/`logout()` read `@Tenant()` — the request's
// already-resolved `TenantContext` (`TenantMiddleware` runs for every
// request, guarded or not) — not `@Req()`, matching this codebase's
// established "decorator over raw request access" convention
// (`@CurrentUser()`). All three now need it (Phase 10, Module 4):
// `Session` rows are tenant-scoped, per CLAUDE.md's non-negotiable
// "tenant scope on EVERY query" rule.
// `GET /auth/sessions`/`DELETE /auth/sessions/:id` are the one
// authenticated surface on this controller (JwtAuthGuard) — listing/
// revoking a session requires knowing WHO is asking, unlike login/
// refresh/logout which authenticate via the credential/token itself.
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
      'app-wide rate limit. An account is temporarily locked after too many failed attempts, ' +
      'independent of that IP-based limit.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description:
      'Email/password combination is not valid for this tenant, or the account is locked.',
  })
  @ApiValidationError()
  login(
    @Body() dto: LoginRequestDto,
    @Tenant() tenant: TenantContext,
    @RequestMetaDecorator() requestMeta: RequestMeta,
  ): Promise<LoginResponseDto> {
    return this.authService.login(dto, tenant, requestMeta);
  }

  // Phase 10, Module 3 (Security Hardening) — same reasoning as login's
  // own throttle: a credential-exchange endpoint, previously sharing
  // only the general app-wide default. See constants file for why the
  // limit is looser than login's.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: REFRESH_THROTTLE_LIMIT, ttl: REFRESH_THROTTLE_TTL_MS } })
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access + refresh token pair',
    description:
      `Rate-limited to ${REFRESH_THROTTLE_LIMIT} attempts per client per minute. Rotates the ` +
      'refresh token (Phase 10, Module 4) — the submitted token is invalidated and cannot be ' +
      'reused; reuse is treated as a theft signal and revokes every active session for the account.',
  })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is missing, malformed, expired, already used, or invalid.',
  })
  @ApiValidationError()
  refresh(
    @Body() dto: RefreshRequestDto,
    @Tenant() tenant: TenantContext,
    @RequestMetaDecorator() requestMeta: RequestMeta,
  ): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto, tenant, requestMeta);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out',
    description:
      'Revokes the session the submitted refreshToken maps to (Phase 10, Module 4). refreshToken ' +
      'is optional for backward compatibility; without one this is a no-op that still succeeds.',
  })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(
    @Body() dto: LogoutRequestDto,
    @Tenant() tenant: TenantContext,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(dto, tenant);
  }

  // Phase 10, Module 4 (Authentication & Session Security) — "Device/
  // session management." Lists the CALLER's own active sessions only.
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "List the current user's own active sessions" })
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  @ApiStandardAuthErrors()
  listSessions(
    @CurrentUser() user: RequestUser,
    @Tenant() tenant: TenantContext,
  ): Promise<SessionResponseDto[]> {
    return this.authService.listSessions(user.email, tenant);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke one of the current user\'s own sessions ("sign out this device")',
  })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('session')
  async revokeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Tenant() tenant: TenantContext,
  ): Promise<void> {
    await this.authService.revokeSession(id, user.email, tenant);
  }
}
