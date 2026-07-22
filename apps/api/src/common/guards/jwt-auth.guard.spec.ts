import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtAuthGuard, extractBearerToken } from './jwt-auth.guard';
import { TokenService } from '../../jwt/token.service';

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

function createExecutionContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers } as unknown as Request;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed Authorization header', () => {
    const request = { headers: { authorization: 'Bearer abc.def.ghi' } } as unknown as Request;

    expect(extractBearerToken(request)).toBe('abc.def.ghi');
  });

  it('returns undefined when the header is missing', () => {
    const request = { headers: {} } as unknown as Request;

    expect(extractBearerToken(request)).toBeUndefined();
  });

  it('returns undefined when the header uses a different scheme (e.g. Basic)', () => {
    const request = { headers: { authorization: 'Basic dXNlcjpwYXNz' } } as unknown as Request;

    expect(extractBearerToken(request)).toBeUndefined();
  });

  it('returns undefined when the Bearer prefix is present but the token is empty', () => {
    const request = { headers: { authorization: 'Bearer ' } } as unknown as Request;

    expect(extractBearerToken(request)).toBeUndefined();
  });

  it('returns undefined when the header value is not a string (e.g. duplicated header)', () => {
    const request = { headers: { authorization: ['Bearer a', 'Bearer b'] } } as unknown as Request;

    expect(extractBearerToken(request)).toBeUndefined();
  });
});

describe('JwtAuthGuard', () => {
  it('allows a request with a valid access token and attaches the decoded user to request.user', () => {
    const tokenService = createTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
    const request = { headers: { authorization: `Bearer ${accessToken}` } } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ email: 'user@example.com' });
  });

  it('rejects a request with no Authorization header with 401', () => {
    const guard = new JwtAuthGuard(createTokenService());

    expect(() => guard.canActivate(createExecutionContext())).toThrow(UnauthorizedException);
  });

  it('rejects an invalid-signature token with 401', () => {
    const tokenService = createTokenService();
    const attackerTokenService = createTokenService({ accessSecret: 'c'.repeat(32) });
    const guard = new JwtAuthGuard(tokenService);
    const forgedToken = attackerTokenService.signAccessToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${forgedToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an expired token with 401', () => {
    const tokenService = createTokenService({ accessTokenTtl: -1 });
    const guard = new JwtAuthGuard(tokenService);
    const expiredToken = tokenService.signAccessToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${expiredToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a malformed token with 401', () => {
    const guard = new JwtAuthGuard(createTokenService());

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: 'Bearer not-a-real-token' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a refresh token presented as an access token with 401', () => {
    const tokenService = createTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${refreshToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('attaches an immutable request.user — genuinely frozen, not just readonly-typed', () => {
    const tokenService = createTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
    const request = { headers: { authorization: `Bearer ${accessToken}` } } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    guard.canActivate(context);
    expect(Object.isFrozen(request.user)).toBe(true);
    expect(() => {
      (request.user as { email: string }).email = 'attacker@example.com';
    }).toThrow(TypeError);
    expect(request.user).toEqual({ email: 'user@example.com' });
  });
});
