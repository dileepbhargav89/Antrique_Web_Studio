import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
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
import { RequestUser } from '../../types/request-user.type';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: TenantContext = { tenantId: '00000000-0000-7000-8000-000000000001' };
const REQUEST_META: RequestMeta = { userAgent: 'jest', ipAddress: '127.0.0.1' };
const CURRENT_USER: RequestUser = {
  id: 'u1',
  email: 'user@example.com',
  tenantId: TENANT.tenantId,
} as RequestUser;

// Resolves through a real Nest TestingModule (same pattern as
// example-domain.controller.spec.ts) so DI wiring itself is verified —
// AuthController -> AuthService -> AuthRepository/SessionRepository/
// TokenService/PasswordService. All dependencies are overridden with
// mocks here: this test is about the controller/service wiring, not
// repository/token/hashing behavior, which have their own dedicated
// spec files (auth.repository.spec.ts, session.repository.spec.ts,
// jwt/token.service.spec.ts, password/password.service.spec.ts) and
// auth.service.spec.ts (which uses a real TokenService/PasswordService
// to verify actual sign/verify/hash/compare/lockout/rotation behavior).
// AuthService.login()/refresh() decode the refresh token's own `exp`
// claim (decodeExpiry(), auth.service.ts) to compute the Session row's
// expiresAt — a plain string like 'fake-refresh-token' isn't a real JWT
// and breaks that base64url-JSON parse. Build a structurally valid
// (unsigned — nothing here verifies the signature) 3-segment token
// instead, matching real jsonwebtoken output shape.
function fakeJwt(payload: Record<string, unknown> = {}): string {
  const segment = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }),
  ).toString('base64url');
  return `header.${segment}.signature`;
}

describe('AuthController', () => {
  function createTokenServiceMock() {
    return {
      signAccessToken: jest.fn(() => fakeJwt({ email: 'user@example.com' })),
      signRefreshToken: jest.fn(() => fakeJwt({ email: 'user@example.com' })),
      verifyRefreshToken: jest.fn(() => ({ email: 'user@example.com', jti: '1' })),
    };
  }

  function createAuthRepositoryMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findMany: jest.fn(async () => []),
      findActiveByEmail: jest.fn(async () => ({
        id: 'u1',
        email: 'user@example.com',
        passwordHash: 'irrelevant-hash',
        failedLoginAttempts: 0,
        lockedUntil: null,
      })),
      recordFailedLogin: jest.fn(async () => ({})),
      recordSuccessfulLogin: jest.fn(async () => ({})),
      ...overrides,
    };
  }

  function createSessionRepositoryMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      createSession: jest.fn(async (data: Record<string, unknown>) => ({ id: 's1', ...data })),
      findByRefreshTokenHash: jest.fn(async () => ({
        id: 's1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      })),
      markRotated: jest.fn(async () => ({})),
      revoke: jest.fn(async () => ({})),
      revokeAllActiveForUser: jest.fn(async () => ({ count: 0 })),
      findActiveForUser: jest.fn(async () => []),
      countActiveForUser: jest.fn(async () => 0),
      findOldestActiveForUser: jest.fn(async () => null),
      findActiveByIdForUser: jest.fn(async () => null),
      ...overrides,
    };
  }

  function createPasswordServiceMock(overrides: Partial<Record<string, unknown>> = {}) {
    return { hash: jest.fn(), compare: jest.fn(async () => true), ...overrides };
  }

  async function createController(
    overrides: {
      tokenService?: Record<string, unknown>;
      authRepository?: Record<string, unknown>;
      sessionRepository?: Record<string, unknown>;
      passwordService?: Record<string, unknown>;
    } = {},
  ) {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: overrides.authRepository ?? createAuthRepositoryMock(),
        },
        {
          provide: SessionRepository,
          useValue: overrides.sessionRepository ?? createSessionRepositoryMock(),
        },
        { provide: TokenService, useValue: overrides.tokenService ?? createTokenServiceMock() },
        {
          provide: PasswordService,
          useValue: overrides.passwordService ?? createPasswordServiceMock(),
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(AuthController);
  }

  it('POST /auth/login resolves via DI and returns the access+refresh tokens AuthService.login() issues', async () => {
    const controller = await createController();
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'user@example.com',
      password: 'secret',
    });

    const result = await controller.login(dto, TENANT, REQUEST_META);

    expect(result).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /auth/login propagates a 401 (UnauthorizedException) for an email with no matching user', async () => {
    const authRepository = createAuthRepositoryMock({
      findActiveByEmail: jest.fn(async () => null),
    });
    const controller = await createController({ authRepository });
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'nobody@example.com',
      password: 'secret',
    });

    await expect(controller.login(dto, TENANT, REQUEST_META)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('POST /auth/login propagates a 401 (UnauthorizedException) for the wrong password', async () => {
    const passwordService = createPasswordServiceMock({ compare: jest.fn(async () => false) });
    const controller = await createController({ passwordService });
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'user@example.com',
      password: 'wrong-password',
    });

    await expect(controller.login(dto, TENANT, REQUEST_META)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('POST /auth/login propagates a 401 for a locked account', async () => {
    const authRepository = createAuthRepositoryMock({
      findActiveByEmail: jest.fn(async () => ({
        id: 'u1',
        email: 'user@example.com',
        passwordHash: 'irrelevant-hash',
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 60_000),
      })),
    });
    const controller = await createController({ authRepository });
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'user@example.com',
      password: 'secret',
    });

    await expect(controller.login(dto, TENANT, REQUEST_META)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('POST /auth/refresh resolves via DI and returns the reissued tokens AuthService.refresh() issues', async () => {
    const controller = await createController();
    const dto: RefreshRequestDto = Object.assign(new RefreshRequestDto(), {
      refreshToken: 'some-valid-looking-token',
    });

    const result = await controller.refresh(dto, TENANT, REQUEST_META);

    expect(result).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /auth/refresh propagates a 401 (UnauthorizedException) for an invalid refresh token', async () => {
    const tokenService = createTokenServiceMock();
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const controller = await createController({ tokenService });
    const dto: RefreshRequestDto = Object.assign(new RefreshRequestDto(), {
      refreshToken: 'forged-token',
    });

    await expect(controller.refresh(dto, TENANT, REQUEST_META)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('POST /auth/refresh propagates a 401 for a token with no matching session', async () => {
    const sessionRepository = createSessionRepositoryMock({
      findByRefreshTokenHash: jest.fn(async () => null),
    });
    const controller = await createController({ sessionRepository });
    const dto: RefreshRequestDto = Object.assign(new RefreshRequestDto(), {
      refreshToken: 'some-valid-looking-token',
    });

    await expect(controller.refresh(dto, TENANT, REQUEST_META)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('POST /auth/logout resolves via DI and delegates to AuthService.logout()', async () => {
    const controller = await createController();

    const result = await controller.logout(new LogoutRequestDto(), TENANT);

    expect(result).toEqual(new LogoutResponseDto());
  });

  it("GET /auth/sessions resolves via DI and returns the current user's active sessions", async () => {
    const issuedAt = new Date();
    const sessionRepository = createSessionRepositoryMock({
      findActiveForUser: jest.fn(async () => [
        {
          id: 's1',
          userAgent: 'jest',
          ipAddress: '127.0.0.1',
          issuedAt,
          lastUsedAt: null,
          expiresAt: new Date(issuedAt.getTime() + 1000),
        },
      ]),
    });
    const controller = await createController({ sessionRepository });

    const result = await controller.listSessions(CURRENT_USER, TENANT);

    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });

  it('DELETE /auth/sessions/:id resolves via DI and delegates to AuthService.revokeSession()', async () => {
    const sessionRepository = createSessionRepositoryMock({
      findActiveByIdForUser: jest.fn(async () => ({ id: 's1' })),
    });
    const controller = await createController({ sessionRepository });

    await controller.revokeSession('s1', CURRENT_USER, TENANT);

    expect(sessionRepository.revoke).toHaveBeenCalledWith('s1');
  });

  it('DELETE /auth/sessions/:id propagates a 404 for a session that does not belong to the caller', async () => {
    const controller = await createController();

    await expect(controller.revokeSession('someone-elses', CURRENT_USER, TENANT)).rejects.toThrow(
      NotFoundException,
    );
  });
});
