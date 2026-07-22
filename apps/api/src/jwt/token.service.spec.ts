import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

// @nestjs/jwt's JwtService takes a plain constructor argument (no Nest DI
// container needed — see its own .d.ts), so this is a genuine, real
// JwtService instance, not a mock: sign()/verify() below run real
// jsonwebtoken code. A plain fake object stands in for the validated
// `jwt` config namespace — env.validation.spec.ts already covers the
// env-parsing rules those values come from; this test is about
// TokenService's own sign/verify behavior.
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

describe('TokenService', () => {
  it('signAccessToken()/verifyAccessToken() round-trip the same payload', () => {
    const service = createTokenService();
    const token = service.signAccessToken({ sub: 'user-1' });

    const decoded = service.verifyAccessToken<{ sub: string }>(token);

    expect(decoded.sub).toBe('user-1');
  });

  it('signRefreshToken()/verifyRefreshToken() round-trip the same payload', () => {
    const service = createTokenService();
    const token = service.signRefreshToken({ sub: 'user-1' });

    const decoded = service.verifyRefreshToken<{ sub: string }>(token);

    expect(decoded.sub).toBe('user-1');
  });

  it('access and refresh tokens use different secrets — a refresh token fails access verification', () => {
    const service = createTokenService();
    const refreshToken = service.signRefreshToken({ sub: 'user-1' });

    expect(() => service.verifyAccessToken(refreshToken)).toThrow();
  });

  it('an access token fails refresh verification (secrets are not interchangeable)', () => {
    const service = createTokenService();
    const accessToken = service.signAccessToken({ sub: 'user-1' });

    expect(() => service.verifyRefreshToken(accessToken)).toThrow();
  });

  it('rejects a token verified against a service configured with a different secret', () => {
    const serviceA = createTokenService({ accessSecret: 'a'.repeat(32) });
    const serviceB = createTokenService({ accessSecret: 'c'.repeat(32) });
    const token = serviceA.signAccessToken({ sub: 'user-1' });

    expect(() => serviceB.verifyAccessToken(token)).toThrow();
  });

  it('rejects an expired token', async () => {
    const service = createTokenService({ accessTokenTtl: -1 });
    const token = service.signAccessToken({ sub: 'user-1' });

    expect(() => service.verifyAccessToken(token)).toThrow(/jwt expired/);
  });

  it('rejects a forged "alg: none" token (classic JWT algorithm-confusion attack)', () => {
    const service = createTokenService();
    // Hand-crafted, not signed via TokenService — an attacker who can
    // only observe a token's shape (not its secret) could construct
    // exactly this: a header claiming no algorithm, a payload of their
    // choosing, and an empty signature segment. Confirmed live during
    // this phase's review before being added as a permanent regression
    // test: @nestjs/jwt's verify() (via jsonwebtoken) correctly requires
    // a real signature and rejects this outright.
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    expect(() => service.verifyAccessToken(forgedToken)).toThrow();
  });

  it('signs with HS256 by default, not an attacker-selectable algorithm', () => {
    const service = createTokenService();
    const token = service.signAccessToken({ sub: 'user-1' });
    const header = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString());

    expect(header.alg).toBe('HS256');
  });

  // Milestone 13 (Security Hardening) — explicit `algorithms: ['HS256']`
  // restriction on verify(), defense in depth beyond the library's own
  // default rejection of `alg: none`/unrequested algorithms (already
  // covered above). A token correctly signed with the RIGHT secret but a
  // DIFFERENT HMAC algorithm (HS384) must still be rejected — proving
  // the restriction is real, not just coincidentally satisfied because
  // nothing before this milestone ever produced a non-HS256 token.
  it('rejects a token signed with the correct secret but a different algorithm (HS384)', () => {
    const service = createTokenService();
    const rawJwtService = new JwtService();
    const wrongAlgToken = rawJwtService.sign(
      { sub: 'user-1' },
      { secret: 'a'.repeat(32), algorithm: 'HS384' },
    );

    expect(() => service.verifyAccessToken(wrongAlgToken)).toThrow();
  });
});
