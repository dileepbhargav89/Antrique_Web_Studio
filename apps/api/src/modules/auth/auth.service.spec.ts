import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { SessionRepository } from './repositories/session.repository';
import { TokenService } from '../../jwt/token.service';
import { PasswordService } from '../../password/password.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { TenantContext } from '../../types/tenant-context.type';
import { RequestMeta } from '../../types/request-meta.type';
import { AuditLogger } from '../../logging';
import { MAX_CONCURRENT_SESSIONS, MAX_FAILED_LOGIN_ATTEMPTS } from './constants/auth.constant';

// Milestone 4 (Organization & Multi-Tenant Foundation) — login() now
// takes a resolved TenantContext (the controller reads it via
// @Tenant()); every login() call in this spec passes this fixed context,
// the same real UUID prior milestones used as DEFAULT_TENANT_ID, since
// this spec is about AuthService's own login logic, not tenant
// resolution itself (that's tenant/tenant-resolver.service.spec.ts's job).
const TENANT: TenantContext = { tenantId: '00000000-0000-7000-8000-000000000001' };
const REQUEST_META: RequestMeta = { userAgent: 'jest', ipAddress: '127.0.0.1' };

function createMockRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: jest.fn(async () => []),
    findActiveByEmail: jest.fn(async () => null),
    recordFailedLogin: jest.fn(async () => ({})),
    recordSuccessfulLogin: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as AuthRepository;
}

// Phase 10, Module 4 (Authentication & Session Security) — Session
// persistence backs real rotation/reuse-detection/lockout, so most
// tests below need a `SessionRepository` fake. Defaults model an
// EMPTY session store (no active sessions, no matching session found)
// — individual tests override to set up the scenario they're testing.
function createMockSessionRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createSession: jest.fn(async (data: Record<string, unknown>) => ({ id: 'session-1', ...data })),
    findByRefreshTokenHash: jest.fn(async () => null),
    markRotated: jest.fn(async () => ({})),
    revoke: jest.fn(async () => ({})),
    revokeAllActiveForUser: jest.fn(async () => ({ count: 0 })),
    findActiveForUser: jest.fn(async () => []),
    countActiveForUser: jest.fn(async () => 0),
    findOldestActiveForUser: jest.fn(async () => null),
    findActiveByIdForUser: jest.fn(async () => null),
    ...overrides,
  } as unknown as SessionRepository;
}

// Same reasoning as jwt/token.service.spec.ts: @nestjs/jwt's JwtService
// takes a plain constructor argument (no Nest DI container needed), so
// this is a genuine, real TokenService, not a mock — sign()/verify()
// below run real jsonwebtoken code.
function createTokenService(overrides: Partial<Record<string, unknown>> = {}) {
  const config = {
    accessSecret: 'a'.repeat(32),
    accessTokenTtl: 900,
    refreshSecret: 'b'.repeat(32),
    refreshTokenTtl: 2_592_000,
    ...overrides,
  };
  return new TokenService(new JwtService(), config as never);
}

// A genuine, real PasswordService (Milestone 1 — login() finally calls
// it) — real Argon2id hash()/compare(), not a mock, the same reasoning
// createTokenService() already established for TokenService. Low cost
// params purely to keep the test suite fast; password.service.spec.ts
// already covers the real config-driven parameters.
function createPasswordService(overrides: Partial<Record<string, unknown>> = {}) {
  const config = {
    memoryCost: 8192,
    timeCost: 2,
    parallelism: 1,
    ...overrides,
  };
  return new PasswordService(config as never);
}

// Spied, not real — refresh()/logout() must never call either method.
function createPasswordServiceSpy() {
  return {
    hash: jest.fn(),
    compare: jest.fn(),
  } as unknown as PasswordService;
}

// Milestone 13 (Security Hardening) — AuthService now logs a
// user.login/user.token_refresh AuditEvent via the injected AUDIT_LOGGER
// on every login()/refresh() call (success and failure alike). A plain
// jest.fn()-backed fake, not the real AuditLoggerService — this spec is
// about AuthService's own login/refresh logic, not AuditLoggerService's
// own formatting (covered by logging/audit-logger.service.spec.ts).
function createFakeAuditLogger() {
  return { log: jest.fn() } as unknown as AuditLogger;
}

function createLoginRequestDto(overrides: Partial<Record<string, unknown>> = {}) {
  return Object.assign(new LoginRequestDto(), {
    email: 'user@example.com',
    password: 'correct horse battery staple',
    ...overrides,
  });
}

function createRefreshRequestDto(refreshToken: string) {
  return Object.assign(new RefreshRequestDto(), { refreshToken });
}

function createLogoutRequestDto(refreshToken?: string) {
  return Object.assign(new LogoutRequestDto(), refreshToken ? { refreshToken } : {});
}

function createUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    tenantId: '00000000-0000-7000-8000-000000000001',
    email: 'user@example.com',
    passwordHash: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createService(
  overrides: {
    repository?: AuthRepository;
    sessionRepository?: SessionRepository;
    tokenService?: TokenService;
    passwordService?: PasswordService;
    auditLogger?: AuditLogger;
  } = {},
) {
  return new AuthService(
    overrides.repository ?? createMockRepository(),
    overrides.sessionRepository ?? createMockSessionRepository(),
    overrides.tokenService ?? createTokenService(),
    overrides.passwordService ?? createPasswordServiceSpy(),
    overrides.auditLogger ?? createFakeAuditLogger(),
  );
}

describe('AuthService', () => {
  describe('login()', () => {
    it('issues real, verifiable tokens for a valid email + password', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const tokenService = createTokenService();
      const service = createService({ repository, tokenService, passwordService });

      const result = await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      const decodedAccess = tokenService.verifyAccessToken<{ email: string }>(result.accessToken);
      expect(decodedAccess.email).toBe('user@example.com');
      const decodedRefresh = tokenService.verifyRefreshToken<{ email: string }>(
        result.refreshToken,
      );
      expect(decodedRefresh.email).toBe('user@example.com');
    });

    it('queries AuthRepository.findActiveByEmail() with the submitted email and the resolved tenantId', async () => {
      const repository = createMockRepository();
      const service = createService({ repository });

      await service
        .login(createLoginRequestDto({ email: 'someone@example.com' }), TENANT, REQUEST_META)
        .catch(() => {
          // Expected to 401 — findActiveByEmail() resolves null by default —
          // this test is only about what login() calls, not the outcome.
        });

      expect(repository.findActiveByEmail).toHaveBeenCalledWith(
        'someone@example.com',
        TENANT.tenantId,
      );
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('returns 401 for an email that does not exist', async () => {
      const service = createService();

      await expect(service.login(createLoginRequestDto(), TENANT, REQUEST_META)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns 401 for a user with no local password set (an IdP-only account)', async () => {
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash: null })),
      });
      const passwordService = createPasswordServiceSpy();
      const service = createService({ repository, passwordService });

      await expect(service.login(createLoginRequestDto(), TENANT, REQUEST_META)).rejects.toThrow(
        UnauthorizedException,
      );
      // Never reaches compare() — there's no hash to compare against.
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('returns 401 for the wrong password', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const service = createService({ repository, passwordService });

      await expect(
        service.login(createLoginRequestDto({ password: 'wrong password' }), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('signs the token payload from the canonical stored email, not the raw request input', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () =>
          createUser({ email: 'User@Example.com', passwordHash }),
        ),
      });
      const tokenService = createTokenService();
      const service = createService({ repository, tokenService, passwordService });

      const result = await service.login(
        createLoginRequestDto({
          email: 'user@example.com',
          password: 'correct horse battery staple',
        }),
        TENANT,
        REQUEST_META,
      );

      const decoded = tokenService.verifyAccessToken<{ email: string }>(result.accessToken);
      expect(decoded.email).toBe('User@Example.com');
    });

    it('signs a JWT payload with a random jti, on top of the standard iat/exp', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const tokenService = createTokenService();
      const service = createService({ repository, tokenService, passwordService });

      const result = await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

      const decoded = tokenService.verifyAccessToken<{ jti: string }>(result.accessToken);
      expect(Object.keys(decoded).sort()).toEqual(['email', 'exp', 'iat', 'jti']);
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.jti.length).toBeGreaterThan(0);
    });

    it('access and refresh tokens use different secrets — one cannot verify as the other', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const tokenService = createTokenService();
      const service = createService({ repository, tokenService, passwordService });

      const result = await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

      expect(() => tokenService.verifyRefreshToken(result.accessToken)).toThrow();
      expect(() => tokenService.verifyAccessToken(result.refreshToken)).toThrow();
    });

    it('persists a Session row for the issued refresh token, with its hash and request metadata', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ id: 'u1', passwordHash })),
      });
      const sessionRepository = createMockSessionRepository();
      const service = createService({ repository, sessionRepository, passwordService });

      const result = await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

      expect(sessionRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT.tenantId,
          userId: 'u1',
          refreshTokenHash: hashToken(result.refreshToken),
          userAgent: REQUEST_META.userAgent,
          ipAddress: REQUEST_META.ipAddress,
        }),
      );
    });

    describe('account lockout', () => {
      it('rejects login when the account is currently locked, without attempting a password compare', async () => {
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({ lockedUntil: new Date(Date.now() + 60_000) }),
          ),
        });
        const passwordService = createPasswordServiceSpy();
        const service = createService({ repository, passwordService });

        await expect(service.login(createLoginRequestDto(), TENANT, REQUEST_META)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(passwordService.compare).not.toHaveBeenCalled();
      });

      it('allows login once lockedUntil is in the past', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({ passwordHash, lockedUntil: new Date(Date.now() - 1000) }),
          ),
        });
        const service = createService({ repository, passwordService });

        await expect(
          service.login(createLoginRequestDto(), TENANT, REQUEST_META),
        ).resolves.toBeDefined();
      });

      it('increments failedLoginAttempts on a wrong password, without locking below the threshold', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({ id: 'u1', passwordHash, failedLoginAttempts: 1 }),
          ),
        });
        const service = createService({ repository, passwordService });

        await service
          .login(createLoginRequestDto({ password: 'wrong' }), TENANT, REQUEST_META)
          .catch(() => {});

        expect(repository.recordFailedLogin).toHaveBeenCalledWith('u1', 1, null);
      });

      it(`locks the account once failedLoginAttempts reaches ${MAX_FAILED_LOGIN_ATTEMPTS}`, async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({
              id: 'u1',
              passwordHash,
              failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1,
            }),
          ),
        });
        const service = createService({ repository, passwordService });

        await service
          .login(createLoginRequestDto({ password: 'wrong' }), TENANT, REQUEST_META)
          .catch(() => {});

        expect(repository.recordFailedLogin).toHaveBeenCalledWith(
          'u1',
          MAX_FAILED_LOGIN_ATTEMPTS - 1,
          expect.any(Date),
        );
      });

      it('resets failedLoginAttempts/lockedUntil on a successful login', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({ id: 'u1', passwordHash, failedLoginAttempts: 3 }),
          ),
        });
        const service = createService({ repository, passwordService });

        await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

        expect(repository.recordSuccessfulLogin).toHaveBeenCalledWith('u1');
      });
    });

    describe('concurrent session limit', () => {
      it(`evicts the oldest active session once ${MAX_CONCURRENT_SESSIONS} already exist`, async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () => createUser({ id: 'u1', passwordHash })),
        });
        const sessionRepository = createMockSessionRepository({
          countActiveForUser: jest.fn(async () => MAX_CONCURRENT_SESSIONS),
          findOldestActiveForUser: jest.fn(async () => ({ id: 'oldest-session' })),
        });
        const service = createService({ repository, sessionRepository, passwordService });

        await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

        expect(sessionRepository.revoke).toHaveBeenCalledWith('oldest-session');
      });

      it('does not evict anything when under the limit', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () => createUser({ id: 'u1', passwordHash })),
        });
        const sessionRepository = createMockSessionRepository({
          countActiveForUser: jest.fn(async () => MAX_CONCURRENT_SESSIONS - 1),
        });
        const service = createService({ repository, sessionRepository, passwordService });

        await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

        expect(sessionRepository.revoke).not.toHaveBeenCalled();
      });
    });

    // Milestone 13 (Security Hardening) — "Verify security-sensitive
    // operations generate audit records": login, failed login.
    describe('audit logging', () => {
      it('logs a SUCCESS user.login event for a valid login, using the verified email as actorId', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () =>
            createUser({ passwordHash, email: 'canonical@example.com' }),
          ),
        });
        const auditLogger = createFakeAuditLogger();
        const service = createService({ repository, passwordService, auditLogger });

        await service.login(createLoginRequestDto(), TENANT, REQUEST_META);

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'user.login',
            action: 'LOGIN',
            resource: 'auth',
            actorType: 'user',
            actorId: 'canonical@example.com',
            outcome: 'SUCCESS',
          }),
        );
      });

      it('logs a FAILURE user.login event for a nonexistent user, using the SUBMITTED email as actorId', async () => {
        const auditLogger = createFakeAuditLogger();
        const service = createService({ auditLogger });

        await service
          .login(createLoginRequestDto({ email: 'attempted@example.com' }), TENANT, REQUEST_META)
          .catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'user.login',
            actorId: 'attempted@example.com',
            outcome: 'FAILURE',
          }),
        );
      });

      it('logs a FAILURE user.login event for a wrong password', async () => {
        const passwordService = createPasswordService();
        const passwordHash = await passwordService.hash('correct horse battery staple');
        const repository = createMockRepository({
          findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
        });
        const auditLogger = createFakeAuditLogger();
        const service = createService({ repository, passwordService, auditLogger });

        await service
          .login(createLoginRequestDto({ password: 'wrong password' }), TENANT, REQUEST_META)
          .catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ event: 'user.login', outcome: 'FAILURE' }),
        );
      });
    });
  });

  describe('refresh()', () => {
    function createActiveSession(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: 'session-1',
        userId: 'u1',
        tenantId: TENANT.tenantId,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
        ...overrides,
      };
    }

    it('issues a fresh access + refresh token pair for a valid refresh token backed by an active session', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => createActiveSession()),
      });
      const service = createService({ tokenService, sessionRepository });

      const result = await service.refresh(
        createRefreshRequestDto(refreshToken),
        TENANT,
        REQUEST_META,
      );

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      const decodedAccess = tokenService.verifyAccessToken<{ email: string }>(result.accessToken);
      expect(decodedAccess.email).toBe('user@example.com');
    });

    it('looks up the session by the SHA-256 hash of the submitted refresh token, tenant-scoped', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => createActiveSession()),
      });
      const service = createService({ tokenService, sessionRepository });

      await service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META);

      expect(sessionRepository.findByRefreshTokenHash).toHaveBeenCalledWith(
        hashToken(refreshToken),
        TENANT.tenantId,
      );
    });

    it('rejects a syntactically valid token with no matching session', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const service = createService({ tokenService });

      await expect(
        service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a refresh token with an invalid signature (wrong secret) with 401', async () => {
      const tokenService = createTokenService();
      const attackerTokenService = createTokenService({ refreshSecret: 'c'.repeat(32) });
      const service = createService({ tokenService });
      const forgedRefreshToken = attackerTokenService.signRefreshToken({
        email: 'user@example.com',
        jti: '1',
      });

      await expect(
        service.refresh(createRefreshRequestDto(forgedRefreshToken), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired refresh token with 401', async () => {
      const tokenService = createTokenService({ refreshTokenTtl: -1 });
      const service = createService({ tokenService });
      const expiredRefreshToken = tokenService.signRefreshToken({
        email: 'user@example.com',
        jti: '1',
      });

      await expect(
        service.refresh(createRefreshRequestDto(expiredRefreshToken), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an access token used as a refresh token with 401', async () => {
      const tokenService = createTokenService();
      const accessToken = tokenService.signAccessToken({ email: 'user@example.com', jti: '1' });
      const service = createService({ tokenService });

      await expect(
        service.refresh(createRefreshRequestDto(accessToken), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a malformed refresh token with 401', async () => {
      const service = createService();

      await expect(
        service.refresh(createRefreshRequestDto('not-a-real-token'), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('never touches AuthRepository or PasswordService', async () => {
      const repository = createMockRepository();
      const passwordService = createPasswordServiceSpy();
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => createActiveSession()),
      });
      const service = createService({
        repository,
        sessionRepository,
        tokenService,
        passwordService,
      });

      await service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META);

      expect(repository.findMany).not.toHaveBeenCalled();
      expect(repository.findActiveByEmail).not.toHaveBeenCalled();
      expect(passwordService.hash).not.toHaveBeenCalled();
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('marks the presented session rotated (revoked + replacedBySessionId) and creates a new one', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => createActiveSession({ id: 'old-session' })),
        createSession: jest.fn(async () => ({ id: 'new-session' })),
      });
      const service = createService({ tokenService, sessionRepository });

      await service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META);

      expect(sessionRepository.markRotated).toHaveBeenCalledWith('old-session', 'new-session');
    });

    it('signs a genuinely fresh access token and refresh token — spied calls prove a new signing operation, not reuse of the submitted token', async () => {
      const tokenService = createTokenService();
      const signAccessSpy = jest.spyOn(tokenService, 'signAccessToken');
      const signRefreshSpy = jest.spyOn(tokenService, 'signRefreshToken');
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      signAccessSpy.mockClear();
      signRefreshSpy.mockClear();
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => createActiveSession()),
      });
      const service = createService({ tokenService, sessionRepository });

      await service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META);

      expect(signAccessSpy).toHaveBeenCalledTimes(1);
      expect(signRefreshSpy).toHaveBeenCalledTimes(1);
      // A fresh jti — not the same payload object reused verbatim.
      const [signedPayload] = signAccessSpy.mock.calls[0]!;
      expect((signedPayload as { jti: string }).jti).not.toBe('1');
    });

    describe('reuse detection', () => {
      it('rejects a REVOKED session (an already-rotated-away token being replayed) and revokes every active session for that user', async () => {
        const tokenService = createTokenService();
        const refreshToken = tokenService.signRefreshToken({
          email: 'user@example.com',
          jti: '1',
        });
        const sessionRepository = createMockSessionRepository({
          findByRefreshTokenHash: jest.fn(async () =>
            createActiveSession({ userId: 'u1', revokedAt: new Date() }),
          ),
        });
        const service = createService({ tokenService, sessionRepository });

        await expect(
          service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META),
        ).rejects.toThrow(UnauthorizedException);
        expect(sessionRepository.revokeAllActiveForUser).toHaveBeenCalledWith('u1');
      });

      it('logs the reuse-detection reason distinctly in the audit trail', async () => {
        const tokenService = createTokenService();
        const refreshToken = tokenService.signRefreshToken({
          email: 'user@example.com',
          jti: '1',
        });
        const sessionRepository = createMockSessionRepository({
          findByRefreshTokenHash: jest.fn(async () =>
            createActiveSession({ revokedAt: new Date() }),
          ),
        });
        const auditLogger = createFakeAuditLogger();
        const service = createService({ tokenService, sessionRepository, auditLogger });

        await service
          .refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META)
          .catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'user.token_refresh',
            outcome: 'FAILURE',
            metadata: { reason: 'refresh token reuse detected' },
          }),
        );
      });
    });

    it('rejects a session past its own expiresAt, even with a structurally valid token', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () =>
          createActiveSession({ expiresAt: new Date(Date.now() - 1000) }),
        ),
      });
      const service = createService({ tokenService, sessionRepository });

      await expect(
        service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Milestone 13 (Security Hardening) — "Verify security-sensitive
    // operations generate audit records": token refresh.
    describe('audit logging', () => {
      it('logs a SUCCESS user.token_refresh event, using the decoded email as actorId', async () => {
        const tokenService = createTokenService();
        const refreshToken = tokenService.signRefreshToken({
          email: 'user@example.com',
          jti: '1',
        });
        const sessionRepository = createMockSessionRepository({
          findByRefreshTokenHash: jest.fn(async () => createActiveSession()),
        });
        const auditLogger = createFakeAuditLogger();
        const service = createService({ tokenService, sessionRepository, auditLogger });

        await service.refresh(createRefreshRequestDto(refreshToken), TENANT, REQUEST_META);

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'user.token_refresh',
            action: 'REFRESH',
            resource: 'auth',
            actorId: 'user@example.com',
            outcome: 'SUCCESS',
          }),
        );
      });

      it('logs a FAILURE user.token_refresh event for an invalid/forged refresh token, with no actorId', async () => {
        const auditLogger = createFakeAuditLogger();
        const service = createService({ auditLogger });

        await service
          .refresh(createRefreshRequestDto('not-a-real-token'), TENANT, REQUEST_META)
          .catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ event: 'user.token_refresh', outcome: 'FAILURE' }),
        );
        const loggedEvent = (auditLogger.log as jest.Mock).mock.calls[0]![0];
        expect(loggedEvent.actorId).toBeUndefined();
      });
    });
  });

  describe('logout()', () => {
    it('is a no-op success when no refreshToken is given (backward compatible with the frozen contract)', async () => {
      const sessionRepository = createMockSessionRepository();
      const service = createService({ sessionRepository });

      const result = await service.logout(createLogoutRequestDto(), TENANT);

      expect(sessionRepository.revoke).not.toHaveBeenCalled();
      expect(result).toEqual(new LogoutResponseDto());
    });

    it('revokes the session matching the submitted refreshToken', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => ({
          id: 'session-1',
          revokedAt: null,
        })),
      });
      const service = createService({ tokenService, sessionRepository });

      await service.logout(createLogoutRequestDto(refreshToken), TENANT);

      expect(sessionRepository.revoke).toHaveBeenCalledWith('session-1');
    });

    it('never throws for an invalid/malformed refreshToken — logout stays idempotent', async () => {
      const service = createService();

      await expect(
        service.logout(createLogoutRequestDto('not-a-real-token'), TENANT),
      ).resolves.toEqual(new LogoutResponseDto());
    });

    it('does not re-revoke an already-revoked session', async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com', jti: '1' });
      const sessionRepository = createMockSessionRepository({
        findByRefreshTokenHash: jest.fn(async () => ({
          id: 'session-1',
          revokedAt: new Date(),
        })),
      });
      const service = createService({ tokenService, sessionRepository });

      await service.logout(createLogoutRequestDto(refreshToken), TENANT);

      expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });
  });

  describe('listSessions()', () => {
    it("maps the user's active sessions to SessionResponseDto, excluding refreshTokenHash", async () => {
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ id: 'u1' })),
      });
      const issuedAt = new Date();
      const sessionRepository = createMockSessionRepository({
        findActiveForUser: jest.fn(async () => [
          {
            id: 's1',
            userAgent: 'Chrome',
            ipAddress: '1.2.3.4',
            issuedAt,
            lastUsedAt: null,
            expiresAt: new Date(issuedAt.getTime() + 1000),
            refreshTokenHash: 'should-not-appear',
          },
        ]),
      });
      const service = createService({ repository, sessionRepository });

      const result = await service.listSessions('user@example.com', TENANT);

      expect(result).toEqual([
        expect.objectContaining({ id: 's1', userAgent: 'Chrome', ipAddress: '1.2.3.4' }),
      ]);
      expect(result[0]).not.toHaveProperty('refreshTokenHash');
    });

    it('throws 401 for an unknown user', async () => {
      const service = createService();

      await expect(service.listSessions('nobody@example.com', TENANT)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeSession()', () => {
    it("revokes a session that belongs to the caller's own account", async () => {
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ id: 'u1' })),
      });
      const sessionRepository = createMockSessionRepository({
        findActiveByIdForUser: jest.fn(async () => ({ id: 's1' })),
      });
      const service = createService({ repository, sessionRepository });

      await service.revokeSession('s1', 'user@example.com', TENANT);

      expect(sessionRepository.findActiveByIdForUser).toHaveBeenCalledWith(
        's1',
        'u1',
        TENANT.tenantId,
      );
      expect(sessionRepository.revoke).toHaveBeenCalledWith('s1');
    });

    it("throws 404 for a session that doesn't belong to the caller (or doesn't exist)", async () => {
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ id: 'u1' })),
      });
      const sessionRepository = createMockSessionRepository();
      const service = createService({ repository, sessionRepository });

      await expect(
        service.revokeSession('someone-elses-session', 'user@example.com', TENANT),
      ).rejects.toThrow(NotFoundException);
      expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
