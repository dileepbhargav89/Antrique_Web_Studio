import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './repositories/auth.repository';
import { TokenService } from '../../jwt/token.service';
import { PasswordService } from '../../password/password.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { AuthTokenPayload } from './types/auth-token-payload.type';
import {
  buildAuthTokenPayload,
  reissueAuthTokenPayload,
} from './mappers/auth-token-payload.mapper';
import { TenantContext } from '../../types/tenant-context.type';
import { AUDIT_LOGGER, AuditLogger } from '../../logging';

// Real, database-backed authentication (Milestone 1), built on the
// token infrastructure Phases 1.2D.6–1.2D.10 already proved: login()
// looks up the submitted email (tenant-scoped, via AuthRepository),
// verifies the password against the stored Argon2id hash (via
// PasswordService — finally called, no longer "registered but
// unwired"), and returns a real 401 for anything invalid — no such
// user, no password set (an IdP-only account), or a wrong password, all
// deliberately indistinguishable in the response, the same
// undifferentiated-401 discipline refresh() already established.
// refresh() verifies a submitted refresh token via TokenService and
// *always* reissues a completely fresh pair on success — that "always
// reissue, never just re-validate and hand back the same tokens" is
// what makes this rotation (Phase 1.2D.10). "Stateless" means exactly
// that: no storage records which tokens have been issued or used, so
// nothing here can revoke a token or detect reuse — see refresh()'s own
// comment for what that implies and doesn't. Still no registration, no
// password reset, no guards, no sessions, no MFA, no refresh-token
// storage/revocation; logout() remains a placeholder (see its own
// comment below). Depends on AuthRepository (constructor injection) —
// never PrismaService directly, per
// docs/architecture/domain-module-guide.md's "Repository layer".
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    @Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger,
  ) {}

  async login(dto: LoginRequestDto, tenant: TenantContext): Promise<LoginResponseDto> {
    // Tenant-scoped by construction, not skipped — CLAUDE.md's
    // non-negotiable "tenant scope on EVERY query" rule. `tenant` is the
    // request's already-resolved `TenantContext`
    // (`TenantMiddleware`/`TenantResolver`, Milestone 4 — Organization &
    // Multi-Tenant Foundation), read via `@Tenant()` in the controller —
    // real, request-based resolution (hostname → `X-Tenant-ID` header →
    // `DEFAULT_TENANT_ID` dev-only fallback), not the fixed stopgap this
    // method used through Milestone 3. See
    // AuthRepository.findActiveByEmail() and
    // docs/implementation/decisions.md.
    const user = await this.authRepository.findActiveByEmail(dto.email, tenant.tenantId);

    // No such user, and a user with no local password set (an IdP-only
    // account — `passwordHash` is nullable, see schema.prisma's `User`
    // model comment) both fail here identically: neither has a hash to
    // verify `dto.password` against. Falling through to
    // `PasswordService.compare()` regardless would need a stand-in hash
    // to compare against — a hardcoded demo hash, or hashing the
    // submitted password and comparing it to itself — both already
    // rejected as anti-patterns in Phase 1.2D.8's design, so this stays
    // an explicit early return instead. Known, accepted gap: this early
    // return is faster than a real compare() call, so response timing
    // alone could theoretically distinguish "no such user"/"IdP-only
    // account" from "wrong password" for an attacker with a precise
    // enough clock — a real but lower-severity concern than the
    // information leaked by a differently-shaped response, which this
    // method avoids (both paths below throw the identical
    // `UnauthorizedException`). Closing that timing gap needs a
    // constant-time decoy comparison, deliberately not added
    // speculatively here.
    if (!user?.passwordHash) {
      this.logLoginAttempt(
        dto.email,
        tenant.tenantId,
        'FAILURE',
        'no such user or no local password set',
      );
      throw new UnauthorizedException();
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      this.logLoginAttempt(dto.email, tenant.tenantId, 'FAILURE', 'wrong password');
      throw new UnauthorizedException();
    }

    this.logLoginAttempt(user.email, tenant.tenantId, 'SUCCESS');

    // The payload is built from `user.email` — the verified, canonically
    // -cased row AuthRepository's case-insensitive lookup found — never
    // `dto.email` (see mappers/auth-token-payload.mapper.ts's own
    // comment for why that distinction matters).
    const payload = buildAuthTokenPayload(user.email);
    return new LoginResponseDto(
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    );
  }

  // Milestone 13 (Security Hardening) — "Verify security-sensitive
  // operations generate audit records": login, failed login. Uses the
  // already-global AUDIT_LOGGER (built Phase 1.2C.8, zero real call
  // sites until now — the same "build the capability, wire it up when
  // the moment is right" pattern PerformanceLogger followed through
  // Milestone 12). `actorId` is the SUBMITTED email even on failure
  // (never the securely-resolved one, which doesn't exist yet on a
  // failed attempt) — deliberately: repeated failed attempts against the
  // same attempted email is exactly the signal a brute-force/credential-
  // stuffing detector reads this trail for. `reason` is internal-only
  // metadata for this structured log entry, never returned to the
  // caller — the HTTP response itself stays the same undifferentiated
  // `401` regardless (see login()'s own header comment for why that
  // matters).
  private logLoginAttempt(
    email: string,
    tenantId: string,
    outcome: 'SUCCESS' | 'FAILURE',
    reason?: string,
  ): void {
    this.auditLogger.log({
      event: 'user.login',
      action: 'LOGIN',
      resource: 'auth',
      actorType: 'user',
      actorId: email,
      outcome,
      metadata: { tenantId, ...(reason ? { reason } : {}) },
    });
  }

  async refresh(dto: RefreshRequestDto): Promise<RefreshResponseDto> {
    // Verifies the submitted refresh token against the refresh secret
    // only (TokenService.verifyRefreshToken) — an access token, signed
    // with a different secret (Phase 1.2D.6), fails signature
    // verification exactly like any other forged/tampered token; there
    // is no separate check needed to reject one. Any failure — bad
    // signature, expired, malformed — is caught and reported identically
    // as 401, deliberately not distinguished in the response: telling a
    // caller *why* a refresh token is invalid (expired vs. forged vs.
    // malformed) leaks more than a caller legitimately needs.
    let decoded: AuthTokenPayload;
    try {
      decoded = this.tokenService.verifyRefreshToken<AuthTokenPayload>(dto.refreshToken);
    } catch {
      this.auditLogger.log({
        event: 'user.token_refresh',
        action: 'REFRESH',
        resource: 'auth',
        actorType: 'user',
        outcome: 'FAILURE',
      });
      throw new UnauthorizedException();
    }
    this.auditLogger.log({
      event: 'user.token_refresh',
      action: 'REFRESH',
      resource: 'auth',
      actorType: 'user',
      actorId: decoded.email,
      outcome: 'SUCCESS',
    });

    // Stateless rotation (Phase 1.2D.10): every successful call below
    // signs a genuinely fresh access token AND a genuinely fresh refresh
    // token — never reuses or re-returns `dto.refreshToken` itself. No
    // rotation storage, no revocation, no blacklist — explicitly out of
    // scope this phase (see this class's own header comment). One real
    // consequence of "stateless": the *same* `dto.refreshToken` can be
    // submitted here more than once and will keep succeeding, each time
    // handing back a new pair, until it naturally expires — nothing
    // tracks that it was already used, so there is no reuse detection
    // and no way to invalidate it early. That's a real, accepted gap for
    // this phase (true rotation-with-reuse-detection needs a persisted
    // record of which token is "current" per session, which needs
    // persistence), not an oversight.
    //
    // Known, verified-live property, not a bug: HS256 JWT signing is
    // deterministic (header + payload + secret -> one exact signature,
    // no per-call nonce), and `iat`/`exp` only carry second precision.
    // Two calls to login()/refresh() for the same email within the same
    // wall-clock second produce byte-identical tokens. Harmless today —
    // nothing tracks token identity to revoke or rotate against — but a
    // future phase adding revocation/rotation on top of this will need a
    // per-token uniqueness claim (e.g. `jti`) to tell same-second
    // issuances apart; out of scope here since it would grow the
    // payload beyond the minimal `{ email }` this phase requires.
    const payload = reissueAuthTokenPayload(decoded);
    return new RefreshResponseDto(
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    );
  }

  async logout(): Promise<LogoutResponseDto> {
    // No session/token to invalidate yet — placeholder only.
    return new LogoutResponseDto();
  }
}
