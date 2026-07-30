import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtAuthGuard, extractBearerToken } from './jwt-auth.guard';
import { TokenService } from '../../jwt/token.service';
import { RequestContextService } from '../../logging';

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

// Phase 10, Module 5 (Observability) — a real RequestContextService, not
// a mock: the new context-enrichment behavior is exactly the thing worth
// proving works against the actual AsyncLocalStorage mechanism, same
// reasoning as using a real TokenService above.
function createGuard(tokenService: TokenService) {
  return new JwtAuthGuard(tokenService, new RequestContextService());
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
    const guard = createGuard(tokenService);
    const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
    const request = { headers: { authorization: `Bearer ${accessToken}` } } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ email: 'user@example.com' });
  });

  it('rejects a request with no Authorization header with 401', () => {
    const guard = createGuard(createTokenService());

    expect(() => guard.canActivate(createExecutionContext())).toThrow(UnauthorizedException);
  });

  it('rejects an invalid-signature token with 401', () => {
    const tokenService = createTokenService();
    const attackerTokenService = createTokenService({ accessSecret: 'c'.repeat(32) });
    const guard = createGuard(tokenService);
    const forgedToken = attackerTokenService.signAccessToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${forgedToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an expired token with 401', () => {
    const tokenService = createTokenService({ accessTokenTtl: -1 });
    const guard = createGuard(tokenService);
    const expiredToken = tokenService.signAccessToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${expiredToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a malformed token with 401', () => {
    const guard = createGuard(createTokenService());

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: 'Bearer not-a-real-token' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a refresh token presented as an access token with 401', () => {
    const tokenService = createTokenService();
    const guard = createGuard(tokenService);
    const refreshToken = tokenService.signRefreshToken({ email: 'user@example.com' });

    expect(() =>
      guard.canActivate(createExecutionContext({ authorization: `Bearer ${refreshToken}` })),
    ).toThrow(UnauthorizedException);
  });

  it('attaches an immutable request.user — genuinely frozen, not just readonly-typed', () => {
    const tokenService = createTokenService();
    const guard = createGuard(tokenService);
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

  it('enriches an already-running RequestContext with userId (Phase 10, Module 5)', () => {
    const tokenService = createTokenService();
    const requestContext = new RequestContextService();
    const guard = new JwtAuthGuard(tokenService, requestContext);
    const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
    const request = { headers: { authorization: `Bearer ${accessToken}` } } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const observed = requestContext.run({ requestId: 'r1', correlationId: 'c1' }, () => {
      guard.canActivate(context);
      return requestContext.getContext();
    });

    expect(observed).toEqual({ requestId: 'r1', correlationId: 'c1', userId: 'user@example.com' });
  });

  it('is a no-op for the RequestContext when no context is running (never throws)', () => {
    const tokenService = createTokenService();
    const guard = createGuard(tokenService);
    const accessToken = tokenService.signAccessToken({ email: 'user@example.com' });
    const request = { headers: { authorization: `Bearer ${accessToken}` } } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).not.toThrow();
  });
});
