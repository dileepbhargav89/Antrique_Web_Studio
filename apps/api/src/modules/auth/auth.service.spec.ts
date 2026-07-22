import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { TokenService } from '../../jwt/token.service';
import { PasswordService } from '../../password/password.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { TenantContext } from '../../types/tenant-context.type';
import { AuditLogger } from '../../logging';

// Milestone 4 (Organization & Multi-Tenant Foundation) — login() now
// takes a resolved TenantContext (the controller reads it via
// @Tenant()); every login() call in this spec passes this fixed context,
// the same real UUID prior milestones used as DEFAULT_TENANT_ID, since
// this spec is about AuthService's own login logic, not tenant
// resolution itself (that's tenant/tenant-resolver.service.spec.ts's job).
const TENANT: TenantContext = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createMockRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findMany: jest.fn(async () => []),
    findActiveByEmail: jest.fn(async () => null),
    ...overrides,
  } as unknown as AuthRepository;
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

function createUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    tenantId: '00000000-0000-7000-8000-000000000001',
    email: 'user@example.com',
    passwordHash: null,
    ...overrides,
  };
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
      const service = new AuthService(
        repository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );

      const result = await service.login(createLoginRequestDto(), TENANT);

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
      const service = new AuthService(
        repository,
        createTokenService(),
        createPasswordService(),
        createFakeAuditLogger(),
      );

      await service
        .login(createLoginRequestDto({ email: 'someone@example.com' }), TENANT)
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
      const repository = createMockRepository();
      const service = new AuthService(
        repository,
        createTokenService(),
        createPasswordService(),
        createFakeAuditLogger(),
      );

      await expect(service.login(createLoginRequestDto(), TENANT)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns 401 for a user with no local password set (an IdP-only account)', async () => {
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash: null })),
      });
      const passwordService = createPasswordServiceSpy();
      const service = new AuthService(
        repository,
        createTokenService(),
        passwordService,
        createFakeAuditLogger(),
      );

      await expect(service.login(createLoginRequestDto(), TENANT)).rejects.toThrow(
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
      const service = new AuthService(
        repository,
        createTokenService(),
        passwordService,
        createFakeAuditLogger(),
      );

      await expect(
        service.login(createLoginRequestDto({ password: 'wrong password' }), TENANT),
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
      const service = new AuthService(
        repository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );

      const result = await service.login(
        createLoginRequestDto({
          email: 'user@example.com',
          password: 'correct horse battery staple',
        }),
        TENANT,
      );

      const decoded = tokenService.verifyAccessToken<{ email: string }>(result.accessToken);
      expect(decoded.email).toBe('User@Example.com');
    });

    it('signs a JWT payload that is minimal — email only, no extra claims beyond the standard iat/exp', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const tokenService = createTokenService();
      const service = new AuthService(
        repository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );

      const result = await service.login(createLoginRequestDto(), TENANT);

      const decoded = tokenService.verifyAccessToken(result.accessToken);
      expect(Object.keys(decoded).sort()).toEqual(['email', 'exp', 'iat']);
    });

    it('access and refresh tokens use different secrets — one cannot verify as the other', async () => {
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const repository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const tokenService = createTokenService();
      const service = new AuthService(
        repository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );

      const result = await service.login(createLoginRequestDto(), TENANT);

      expect(() => tokenService.verifyRefreshToken(result.accessToken)).toThrow();
      expect(() => tokenService.verifyAccessToken(result.refreshToken)).toThrow();
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
        const service = new AuthService(
          repository,
          createTokenService(),
          passwordService,
          auditLogger,
        );

        await service.login(createLoginRequestDto(), TENANT);

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
        const repository = createMockRepository();
        const auditLogger = createFakeAuditLogger();
        const service = new AuthService(
          repository,
          createTokenService(),
          createPasswordService(),
          auditLogger,
        );

        await service
          .login(createLoginRequestDto({ email: 'attempted@example.com' }), TENANT)
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
        const service = new AuthService(
          repository,
          createTokenService(),
          passwordService,
          auditLogger,
        );

        await service
          .login(createLoginRequestDto({ password: 'wrong password' }), TENANT)
          .catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ event: 'user.login', outcome: 'FAILURE' }),
        );
      });
    });
  });

  describe('refresh()', () => {
    it('issues a fresh access + refresh token pair for a valid refresh token', async () => {
      const tokenService = createTokenService();
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const passwordService = createPasswordService();
      const passwordHash = await passwordService.hash('correct horse battery staple');
      const loginRepository = createMockRepository({
        findActiveByEmail: jest.fn(async () => createUser({ passwordHash })),
      });
      const loginService = new AuthService(
        loginRepository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );
      const { refreshToken } = await loginService.login(createLoginRequestDto(), TENANT);

      const result = await service.refresh(createRefreshRequestDto(refreshToken));

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');

      const decodedAccess = tokenService.verifyAccessToken<{ email: string }>(result.accessToken);
      expect(decodedAccess.email).toBe('user@example.com');
      const decodedRefresh = tokenService.verifyRefreshToken<{ email: string }>(
        result.refreshToken,
      );
      expect(decodedRefresh.email).toBe('user@example.com');
    });

    it("re-signs a clean payload — the new tokens don't carry the old token's iat/exp", async () => {
      const tokenService = createTokenService();
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );

      const result = await service.refresh(createRefreshRequestDto(refreshToken));

      const decoded = tokenService.verifyAccessToken(result.accessToken);
      expect(Object.keys(decoded).sort()).toEqual(['email', 'exp', 'iat']);
    });

    it('rejects a refresh token with an invalid signature (wrong secret) with 401', async () => {
      const tokenService = createTokenService();
      const attackerTokenService = createTokenService({ refreshSecret: 'c'.repeat(32) });
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const forgedRefreshToken = attackerTokenService.signRefreshToken({
        email: 'user@example.com',
      });

      await expect(service.refresh(createRefreshRequestDto(forgedRefreshToken))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired refresh token with 401', async () => {
      const tokenService = createTokenService({ refreshTokenTtl: -1 });
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const expiredRefreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

      await expect(service.refresh(createRefreshRequestDto(expiredRefreshToken))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an access token used as a refresh token with 401', async () => {
      const tokenService = createTokenService();
      const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );

      await expect(service.refresh(createRefreshRequestDto(accessToken))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a malformed refresh token with 401', async () => {
      const service = new AuthService(
        createMockRepository(),
        createTokenService(),
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );

      await expect(service.refresh(createRefreshRequestDto('not-a-real-token'))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('never touches AuthRepository or PasswordService', async () => {
      const repository = createMockRepository();
      const passwordService = createPasswordServiceSpy();
      const tokenService = createTokenService();
      const service = new AuthService(
        repository,
        tokenService,
        passwordService,
        createFakeAuditLogger(),
      );
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

      await service.refresh(createRefreshRequestDto(refreshToken));

      expect(repository.findMany).not.toHaveBeenCalled();
      expect(repository.findActiveByEmail).not.toHaveBeenCalled();
      expect(passwordService.hash).not.toHaveBeenCalled();
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('signs a genuinely fresh access token and refresh token — spied calls prove a new signing operation, not reuse of the submitted token', async () => {
      const tokenService = createTokenService();
      const signAccessSpy = jest.spyOn(tokenService, 'signAccessToken');
      const signRefreshSpy = jest.spyOn(tokenService, 'signRefreshToken');
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });
      signAccessSpy.mockClear();
      signRefreshSpy.mockClear();

      await service.refresh(createRefreshRequestDto(refreshToken));

      expect(signAccessSpy).toHaveBeenCalledTimes(1);
      expect(signAccessSpy).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(signRefreshSpy).toHaveBeenCalledTimes(1);
      expect(signRefreshSpy).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it('is stateless — the same refresh token can be submitted more than once, each time succeeding with a fresh pair', async () => {
      const tokenService = createTokenService();
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

      // No storage tracks that this token was already used, so nothing
      // here can reject a second use — Phase 1.2D.10's "stateless" means
      // exactly this, and true reuse detection would need a persisted
      // record of which refresh token is "current," which this phase
      // deliberately does not add.
      const first = await service.refresh(createRefreshRequestDto(refreshToken));
      const second = await service.refresh(createRefreshRequestDto(refreshToken));

      expect(typeof first.accessToken).toBe('string');
      expect(typeof second.accessToken).toBe('string');
      expect(() => tokenService.verifyAccessToken(first.accessToken)).not.toThrow();
      expect(() => tokenService.verifyAccessToken(second.accessToken)).not.toThrow();
    });

    it('supports a multi-hop rotation chain — a newly issued refresh token can itself be used to refresh again', async () => {
      const tokenService = createTokenService();
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const firstRefreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

      const second = await service.refresh(createRefreshRequestDto(firstRefreshToken));
      const third = await service.refresh(createRefreshRequestDto(second.refreshToken));

      const decoded = tokenService.verifyAccessToken<{ email: string }>(third.accessToken);
      expect(decoded.email).toBe('user@example.com');
    });

    it('produces genuinely distinct tokens once real wall-clock time passes between issuances', async () => {
      const tokenService = createTokenService();
      const service = new AuthService(
        createMockRepository(),
        tokenService,
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );
      const firstRefreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });
      const first = await service.refresh(createRefreshRequestDto(firstRefreshToken));

      // Real delay, not a mocked timer — HS256 signing is deterministic
      // and iat/exp carry only second precision (see auth.service.ts's
      // refresh() comment), so two issuances within the same wall-clock
      // second are byte-identical; this proves genuine rotation once that
      // second boundary is crossed, following the same real-timing
      // testing precedent performance-logger.service.spec.ts already
      // established for its own duration assertions.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const second = await service.refresh(createRefreshRequestDto(first.refreshToken));

      expect(second.accessToken).not.toBe(first.accessToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
    });

    // Milestone 13 (Security Hardening) — "Verify security-sensitive
    // operations generate audit records": token refresh.
    describe('audit logging', () => {
      it('logs a SUCCESS user.token_refresh event, using the decoded email as actorId', async () => {
        const tokenService = createTokenService();
        const auditLogger = createFakeAuditLogger();
        const service = new AuthService(
          createMockRepository(),
          tokenService,
          createPasswordServiceSpy(),
          auditLogger,
        );
        const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

        await service.refresh(createRefreshRequestDto(refreshToken));

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
        const service = new AuthService(
          createMockRepository(),
          createTokenService(),
          createPasswordServiceSpy(),
          auditLogger,
        );

        await service.refresh(createRefreshRequestDto('not-a-real-token')).catch(() => {});

        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ event: 'user.token_refresh', outcome: 'FAILURE' }),
        );
        const loggedEvent = (auditLogger.log as jest.Mock).mock.calls[0]![0];
        expect(loggedEvent.actorId).toBeUndefined();
      });
    });
  });

  describe('logout()', () => {
    it('returns a placeholder response without touching the repository', async () => {
      const repository = createMockRepository();
      const service = new AuthService(
        repository,
        createTokenService(),
        createPasswordServiceSpy(),
        createFakeAuditLogger(),
      );

      const result = await service.logout();

      expect(repository.findMany).not.toHaveBeenCalled();
      expect(repository.findActiveByEmail).not.toHaveBeenCalled();
      expect(result).toEqual(new LogoutResponseDto());
    });
  });
});
