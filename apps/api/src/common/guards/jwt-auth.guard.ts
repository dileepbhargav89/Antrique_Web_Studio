import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../../jwt/token.service';
import { RequestUser } from '../../types/request-user.type';
import { AUTHORIZATION_HEADER, BEARER_PREFIX } from './jwt-auth.constant';
import { RequestContextService } from '../../logging';

// Milestone 2 (Authorization Foundation) — a hand-written CanActivate
// guard, not Passport (explicitly out of scope): verifies the
// `Authorization: Bearer <token>` header exclusively via
// TokenService.verifyAccessToken() — never @nestjs/jwt's JwtService
// directly, and never TokenService.verifyRefreshToken(). That single
// choice of verify method is also what rejects a refresh token presented
// here: it was signed with the *refresh* secret (Phase 1.2D.6), and
// verifyAccessToken() only accepts the *access* secret, so it fails the
// same signature check a forged token would — no separate "is this a
// refresh token" branch needed, the same "no special case" pattern
// AuthService.refresh() already established for the reverse direction.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly requestContext: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let decoded: RequestUser;
    try {
      decoded = this.tokenService.verifyAccessToken<RequestUser>(token);
    } catch {
      // Invalid signature, expired, malformed, or a refresh token (wrong
      // secret) — one undifferentiated 401, the same discipline
      // AuthService.login()/refresh() already established: telling a
      // caller *why* a token was rejected leaks more than it needs to
      // know.
      throw new UnauthorizedException();
    }

    // Rebuilt, not the raw decoded object — `decoded` carries `iat`/`exp`
    // at runtime (jsonwebtoken merges them in on every sign, invisible
    // through `RequestUser`'s type; see auth-token-payload.mapper.ts's
    // identical reasoning). Picking only `email` keeps `request.user`
    // genuinely minimal, not just minimally typed. `Object.freeze()`
    // makes "immutable after authentication" (this milestone's own
    // requirement) a real runtime guarantee, not only a `readonly` type
    // hint a caller could still bypass with an `as` cast.
    request.user = Object.freeze({ email: decoded.email });

    // Phase 10, Module 5 (Observability) — enriches the already-running
    // RequestContext with `userId` so every log line for the rest of
    // this request is attributable to a real caller, the same way
    // TenantMiddleware already does for `tenantId`. `email`, not a
    // database id: `RequestUser`/the token payload never carry one (see
    // this guard's own header comment) — the same identity value audit
    // logging already uses as `actorId` (auth.service.ts), so this stays
    // consistent with the one identity key this codebase actually has
    // readily available at the HTTP layer.
    this.requestContext.updateContext({ userId: decoded.email });

    return true;
  }
}

// Exported standalone (not a private guard method) so the header-parsing
// logic itself — missing header, wrong scheme, empty token — is directly
// unit-testable without needing a full ExecutionContext for every edge
// case.
export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers[AUTHORIZATION_HEADER];
  if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : undefined;
}
