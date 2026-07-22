import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';

// Milestone 13 (Security Hardening) — the one, fixed, non-configurable
// signing/verification algorithm for every token this service issues or
// accepts — see verifyAccessToken()'s own comment for why this is
// explicit rather than left to the library's own default. Not exposed
// via env var — the same "not configurable" treatment this codebase
// already applies to the Argon2id variant (password/config/hash.config.ts):
// a configurable algorithm would let an environment accidentally weaken
// to something else, a security regression rather than a legitimate
// environment difference. `as const` (not an explicit `Algorithm` type
// import — `@types/jsonwebtoken` isn't a direct dependency here) gives
// this the narrow `'HS256'` literal type @nestjs/jwt's own sign()/
// verify() options structurally require.
const JWT_ALGORITHM = 'HS256' as const;

// Named TokenService, not JwtService — @nestjs/jwt's own class is already
// called JwtService, and naming this wrapper the same would collide with
// (and read as identical to) that import. Wraps @nestjs/jwt's generic
// sign()/verify() with access-vs-refresh-typed methods so no caller needs
// to know which secret/expiration belongs to which token type.
//
// Built as reusable infrastructure (Phase 1.2D.6) — genuinely functional
// (round-trip sign→verify works, verified in token.service.spec.ts).
// AuthService (apps/api/src/modules/auth/) calls signAccessToken()/
// signRefreshToken() to issue the token pair login() returns (Phase
// 1.2D.8), and verifyRefreshToken() — plus the same two sign* methods to
// reissue — to back refresh() (Phase 1.2D.9), returning 401 on any
// failure. verifyAccessToken() is called by JwtAuthGuard
// (apps/api/src/common/guards/jwt-auth.guard.ts, Milestone 2) to
// authorize requests to any route it protects — see this module's
// README. logout() remains a placeholder.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  signAccessToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessTokenTtl,
      algorithm: JWT_ALGORITHM,
    });
  }

  signRefreshToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: this.config.refreshSecret,
      expiresIn: this.config.refreshTokenTtl,
      algorithm: JWT_ALGORITHM,
    });
  }

  // Generic type param, not a fixed claims shape: no real token payload
  // (e.g. { sub, tenantId }) is defined yet — deciding that shape is a
  // real-authentication concern, out of scope for infrastructure-only
  // (see this class's own header comment). Throws @nestjs/jwt's own
  // JsonWebTokenError/TokenExpiredError on an invalid/expired token —
  // deliberately not caught/wrapped here; that's a future phase's
  // decision to make once something real calls this.
  //
  // `algorithms: [JWT_ALGORITHM]` (Milestone 13 — Security Hardening) —
  // explicitly restricts verification to HS256 rather than relying
  // solely on jsonwebtoken's own library defaults (which already reject
  // `alg: none` and any algorithm the caller doesn't opt into — confirmed
  // live, see token.service.spec.ts's own regression test). Defense in
  // depth: this makes the restriction an explicit, reviewable line in
  // THIS codebase, not an implicit property of whatever the dependency
  // happens to default to.
  verifyAccessToken<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.config.accessSecret,
      algorithms: [JWT_ALGORITHM],
    });
  }

  verifyRefreshToken<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.config.refreshSecret,
      algorithms: [JWT_ALGORITHM],
    });
  }
}
