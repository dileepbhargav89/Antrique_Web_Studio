import { createHash } from 'node:crypto';
import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './repositories/auth.repository';
import { SessionRepository } from './repositories/session.repository';
import { TokenService } from '../../jwt/token.service';
import { PasswordService } from '../../password/password.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { AuthTokenPayload } from './types/auth-token-payload.type';
import {
  buildAuthTokenPayload,
  reissueAuthTokenPayload,
} from './mappers/auth-token-payload.mapper';
import { TenantContext } from '../../types/tenant-context.type';
import { RequestMeta } from '../../types/request-meta.type';
import { AUDIT_LOGGER, AuditLogger } from '../../logging';
import { verifyMfaIfEnrolled } from './mfa-verification.util';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCKOUT_DURATION_MS,
  MAX_CONCURRENT_SESSIONS,
} from './constants/auth.constant';

// Phase 10, Module 4 (Authentication & Session Security) — real,
// database-backed sessions: `login()`/`refresh()` now persist a
// `Session` row per issued refresh token (schema.prisma's own model,
// built long ago, never wired up until now — see that model's own doc
// comment). This closes several gaps at once:
// - **Refresh rotation is no longer stateless.** Every `refresh()` call
//   marks the presented session `revokedAt` + `replacedBySessionId`,
//   and creates a fresh one — a session id, not just a token shape,
//   tracks "what's currently valid."
// - **Reuse detection.** Presenting an ALREADY-ROTATED (revoked)
//   session's refresh token is a theft signal — every active session
//   for that user gets revoked (SessionRepository.revokeAllActiveForUser()),
//   not just the one being replayed.
// - **`logout()` is real** — revokes the specific session the caller's
//   refresh token maps to, instead of the prior placeholder.
// - **Account lockout** (`AuthRepository.recordFailedLogin()`/
//   `recordSuccessfulLogin()`) closes a gap IP-based throttling
//   (Module 3) can't: a distributed attack against one account from
//   many IPs.
// - **Concurrent session limit** — a login past `MAX_CONCURRENT_SESSIONS`
//   evicts the oldest active session first.
// - **MFA extension point** (`verifyMfaIfEnrolled()`) — called after
//   password verification, before any token is issued; a documented
//   no-op today (see that function's own comment).
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    @Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger,
  ) {}

  async login(
    dto: LoginRequestDto,
    tenant: TenantContext,
    requestMeta: RequestMeta,
  ): Promise<LoginResponseDto> {
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

    // Phase 10, Module 4 — account lockout, checked BEFORE the password
    // compare so a locked account never even reaches PasswordService
    // (no point spending an Argon2id hash's worth of CPU verifying a
    // password that can't succeed anyway). Same undifferentiated-401
    // response as every other failure path here — a locked account
    // doesn't get a different, more informative error.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.logLoginAttempt(user.email, tenant.tenantId, 'FAILURE', 'account locked');
      throw new UnauthorizedException();
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordFailedAttempt(user.id, user.failedLoginAttempts);
      this.logLoginAttempt(dto.email, tenant.tenantId, 'FAILURE', 'wrong password');
      throw new UnauthorizedException();
    }

    await verifyMfaIfEnrolled(user.id);

    await this.authRepository.recordSuccessfulLogin(user.id);
    this.logLoginAttempt(user.email, tenant.tenantId, 'SUCCESS');

    await this.enforceConcurrentSessionLimit(user.id);

    // The payload is built from `user.email` — the verified, canonically
    // -cased row AuthRepository's case-insensitive lookup found — never
    // `dto.email` (see mappers/auth-token-payload.mapper.ts's own
    // comment for why that distinction matters).
    const payload = buildAuthTokenPayload(user.email);
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    await this.sessionRepository.createSession({
      tenantId: tenant.tenantId,
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: decodeExpiry(refreshToken),
      ...requestMeta,
    });

    return new LoginResponseDto(accessToken, refreshToken);
  }

  private async recordFailedAttempt(userId: string, currentAttempts: number): Promise<void> {
    const willLock = currentAttempts + 1 >= MAX_FAILED_LOGIN_ATTEMPTS;
    await this.authRepository.recordFailedLogin(
      userId,
      currentAttempts,
      willLock ? new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_MS) : null,
    );
  }

  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const activeCount = await this.sessionRepository.countActiveForUser(userId);
    if (activeCount < MAX_CONCURRENT_SESSIONS) {
      return;
    }
    const oldest = await this.sessionRepository.findOldestActiveForUser(userId);
    if (oldest) {
      await this.sessionRepository.revoke(oldest.id);
    }
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

  async refresh(
    dto: RefreshRequestDto,
    tenant: TenantContext,
    requestMeta: RequestMeta,
  ): Promise<RefreshResponseDto> {
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
      this.logRefreshAttempt(undefined, 'FAILURE');
      throw new UnauthorizedException();
    }

    const tokenHash = hashToken(dto.refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(tokenHash, tenant.tenantId);

    if (!session) {
      // A syntactically valid, correctly-signed token with no matching
      // session — e.g. issued before this session-persistence layer
      // existed, or a session was hard-deleted. Not a reuse/theft
      // signal (there's no genuine prior session to revoke against),
      // just an ordinary invalid-credential response.
      this.logRefreshAttempt(decoded.email, 'FAILURE', 'no matching session');
      throw new UnauthorizedException();
    }

    if (session.revokedAt) {
      // Reuse of an already-rotated-away session: the real theft
      // signal this whole design exists to catch. Response is the
      // SAME generic 401 as every other failure — the caller never
      // learns "you triggered a security response" — but the audit
      // trail records the distinct reason, and every active session
      // for this user is revoked as the safe default (see
      // SessionRepository.revokeAllActiveForUser()'s own comment).
      await this.sessionRepository.revokeAllActiveForUser(session.userId);
      this.logRefreshAttempt(decoded.email, 'FAILURE', 'refresh token reuse detected');
      throw new UnauthorizedException();
    }

    if (session.expiresAt <= new Date()) {
      this.logRefreshAttempt(decoded.email, 'FAILURE', 'session expired');
      throw new UnauthorizedException();
    }

    this.logRefreshAttempt(decoded.email, 'SUCCESS');

    // Always signs a genuinely fresh access token AND a genuinely fresh
    // refresh token — never reuses or re-returns `dto.refreshToken`
    // itself. `reissueAuthTokenPayload()` mints a new `jti` (see that
    // function's own comment) so the new refresh token hashes to a
    // value distinct from every prior one, including same-second
    // reissues.
    const payload = reissueAuthTokenPayload(decoded);
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    const newSession = await this.sessionRepository.createSession({
      tenantId: tenant.tenantId,
      userId: session.userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: decodeExpiry(refreshToken),
      ...requestMeta,
    });
    await this.sessionRepository.markRotated(session.id, newSession.id);

    return new RefreshResponseDto(accessToken, refreshToken);
  }

  private logRefreshAttempt(
    email: string | undefined,
    outcome: 'SUCCESS' | 'FAILURE',
    reason?: string,
  ): void {
    this.auditLogger.log({
      event: 'user.token_refresh',
      action: 'REFRESH',
      resource: 'auth',
      actorType: 'user',
      ...(email ? { actorId: email } : {}),
      outcome,
      ...(reason ? { metadata: { reason } } : {}),
    });
  }

  // Phase 10, Module 4 — real logout: revokes the specific session
  // `dto.refreshToken` maps to. `dto.refreshToken` is OPTIONAL (see
  // LogoutRequestDto's own comment on the frozen-contract reasoning) —
  // without one, there's no specific session to revoke, so this is a
  // no-op that still returns success (logout is idempotent and never
  // leaks whether a token was valid, same discipline login()/refresh()
  // already establish). An already-invalid/expired/foreign token is
  // handled the same way — logging out never throws.
  async logout(dto: LogoutRequestDto, tenant: TenantContext): Promise<LogoutResponseDto> {
    if (!dto.refreshToken) {
      return new LogoutResponseDto();
    }
    let decoded: AuthTokenPayload;
    try {
      decoded = this.tokenService.verifyRefreshToken<AuthTokenPayload>(dto.refreshToken);
    } catch {
      return new LogoutResponseDto();
    }
    const session = await this.sessionRepository.findByRefreshTokenHash(
      hashToken(dto.refreshToken),
      tenant.tenantId,
    );
    if (session && !session.revokedAt) {
      await this.sessionRepository.revoke(session.id);
      this.auditLogger.log({
        event: 'user.logout',
        action: 'LOGOUT',
        resource: 'auth',
        actorType: 'user',
        actorId: decoded.email,
        outcome: 'SUCCESS',
      });
    }
    return new LogoutResponseDto();
  }

  // Phase 10, Module 4 — "Device/session management." Lists the
  // CALLER's own active sessions only (never another user's — `userId`
  // is resolved from the already-authenticated `email`, not accepted as
  // a parameter) — see auth.controller.ts's `GET /auth/sessions` route.
  async listSessions(email: string, tenant: TenantContext): Promise<SessionResponseDto[]> {
    const user = await this.authRepository.findActiveByEmail(email, tenant.tenantId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const sessions = await this.sessionRepository.findActiveForUser(user.id, tenant.tenantId);
    return sessions.map(
      (s) =>
        new SessionResponseDto(
          s.id,
          s.userAgent,
          s.ipAddress,
          s.issuedAt,
          s.lastUsedAt,
          s.expiresAt,
        ),
    );
  }

  // "Sign out other devices" — revokes ONE of the caller's own sessions
  // by id. Ownership-checked (`findActiveByIdForUser`, scoped to this
  // resolved user + tenant) before revoking — never lets one user revoke
  // another's session by guessing an id.
  async revokeSession(sessionId: string, email: string, tenant: TenantContext): Promise<void> {
    const user = await this.authRepository.findActiveByEmail(email, tenant.tenantId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const session = await this.sessionRepository.findActiveByIdForUser(
      sessionId,
      user.id,
      tenant.tenantId,
    );
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    await this.sessionRepository.revoke(session.id);
  }
}

// Node's `crypto`, not a library — a refresh token is already a long,
// high-entropy, server-signed JWT (unlike a user-chosen password), so a
// fast cryptographic hash is the right tool here, not Argon2id's
// deliberately slow, memory-hard KDF (which exists to resist brute-
// forcing a LOW-entropy secret — irrelevant to a token nobody is
// guessing, only ever stealing/replaying). Storing the hash rather than
// the raw token means a database leak alone doesn't hand out valid
// bearer tokens.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Reads the real `exp` claim `jsonwebtoken` embeds into every signed
// token (via `expiresIn`, TokenService.signRefreshToken()) rather than
// recomputing "now + refreshTokenTtl" separately — a second computation
// could drift by the few milliseconds between signing and this call,
// and would silently diverge from the token's own claim if the JWT
// library's own `expiresIn` rounding ever changed. Decoding (not
// verifying) is safe here: this token was JUST signed by this same
// process, not attacker-controlled input.
function decodeExpiry(token: string): Date {
  const payloadSegment = token.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payloadSegment ?? '', 'base64url').toString('utf8')) as {
    exp: number;
  };
  return new Date(decoded.exp * 1000);
}
