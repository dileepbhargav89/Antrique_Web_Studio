import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { TokenService } from '../../jwt/token.service';
import { PasswordService } from '../../password/password.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { TenantContext } from '../../types/tenant-context.type';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: TenantContext = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Resolves through a real Nest TestingModule (same pattern as
// example-domain.controller.spec.ts) so DI wiring itself is verified —
// AuthController -> AuthService -> AuthRepository/TokenService/
// PasswordService. All three dependencies are overridden with mocks
// here: this test is about the controller/service wiring, not
// repository/token/hashing behavior, which have their own dedicated
// spec files (auth.repository.spec.ts, jwt/token.service.spec.ts,
// password/password.service.spec.ts) and auth.service.spec.ts (which
// uses a real TokenService to verify actual sign/verify/reject
// behavior, including the 401 paths).
describe('AuthController', () => {
  function createTokenServiceMock() {
    return {
      signAccessToken: jest.fn(() => 'fake-access-token'),
      signRefreshToken: jest.fn(() => 'fake-refresh-token'),
      verifyRefreshToken: jest.fn(() => ({ email: 'user@example.com' })),
    };
  }

  function createAuthRepositoryMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      findMany: jest.fn(async () => []),
      findActiveByEmail: jest.fn(async () => ({
        id: 'u1',
        email: 'user@example.com',
        passwordHash: 'irrelevant-hash',
      })),
      ...overrides,
    };
  }

  function createPasswordServiceMock(overrides: Partial<Record<string, unknown>> = {}) {
    return { hash: jest.fn(), compare: jest.fn(async () => true), ...overrides };
  }

  async function createController(
    tokenService: Record<string, unknown> = createTokenServiceMock(),
    authRepository: Record<string, unknown> = createAuthRepositoryMock(),
    passwordService: Record<string, unknown> = createPasswordServiceMock(),
  ) {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: PasswordService, useValue: passwordService },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
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

    const result = await controller.login(dto, TENANT);

    expect(result).toEqual({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
    });
  });

  it('POST /auth/login propagates a 401 (UnauthorizedException) for an email with no matching user', async () => {
    const authRepository = createAuthRepositoryMock({
      findActiveByEmail: jest.fn(async () => null),
    });
    const controller = await createController(createTokenServiceMock(), authRepository);
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'nobody@example.com',
      password: 'secret',
    });

    await expect(controller.login(dto, TENANT)).rejects.toThrow(UnauthorizedException);
  });

  it('POST /auth/login propagates a 401 (UnauthorizedException) for the wrong password', async () => {
    const authRepository = createAuthRepositoryMock();
    const passwordService = createPasswordServiceMock({ compare: jest.fn(async () => false) });
    const controller = await createController(
      createTokenServiceMock(),
      authRepository,
      passwordService,
    );
    const dto: LoginRequestDto = Object.assign(new LoginRequestDto(), {
      email: 'user@example.com',
      password: 'wrong-password',
    });

    await expect(controller.login(dto, TENANT)).rejects.toThrow(UnauthorizedException);
  });

  it('POST /auth/refresh resolves via DI and returns the reissued tokens AuthService.refresh() issues', async () => {
    const controller = await createController();
    const dto: RefreshRequestDto = Object.assign(new RefreshRequestDto(), {
      refreshToken: 'some-valid-looking-token',
    });

    const result = await controller.refresh(dto);

    expect(result).toEqual({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
    });
  });

  it('POST /auth/refresh propagates a 401 (UnauthorizedException) for an invalid refresh token', async () => {
    const tokenService = createTokenServiceMock();
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const controller = await createController(tokenService);
    const dto: RefreshRequestDto = Object.assign(new RefreshRequestDto(), {
      refreshToken: 'forged-token',
    });

    await expect(controller.refresh(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('POST /auth/logout resolves via DI and delegates to AuthService.logout()', async () => {
    const controller = await createController();

    const result = await controller.logout();

    expect(result).toEqual(new LogoutResponseDto());
  });
});
