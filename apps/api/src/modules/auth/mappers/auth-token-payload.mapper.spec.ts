import { buildAuthTokenPayload, reissueAuthTokenPayload } from './auth-token-payload.mapper';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('buildAuthTokenPayload', () => {
  it('builds a payload containing the email and a random jti, nothing else', () => {
    const payload = buildAuthTokenPayload('user@example.com');

    expect(payload.email).toBe('user@example.com');
    expect(Object.keys(payload).sort()).toEqual(['email', 'jti']);
  });

  it('generates a fresh, random-looking (UUID v4) jti on every call', () => {
    const first = buildAuthTokenPayload('user@example.com');
    const second = buildAuthTokenPayload('user@example.com');

    expect(first.jti).toMatch(UUID_V4_PATTERN);
    expect(second.jti).toMatch(UUID_V4_PATTERN);
    expect(first.jti).not.toBe(second.jti);
  });

  it('never includes anything beyond the email/jti it was given', () => {
    const payload = buildAuthTokenPayload('user@example.com');

    expect(JSON.stringify(payload)).not.toContain('super-secret');
  });
});

describe('reissueAuthTokenPayload', () => {
  it('rebuilds a clean payload with the same email and a fresh jti', () => {
    const decoded = { email: 'user@example.com', jti: 'old-jti' };

    const payload = reissueAuthTokenPayload(decoded);

    expect(payload.email).toBe('user@example.com');
    expect(Object.keys(payload).sort()).toEqual(['email', 'jti']);
    expect(payload.jti).not.toBe('old-jti');
    expect(payload.jti).toMatch(UUID_V4_PATTERN);
  });

  it('strips standard JWT claims (iat/exp) a real decoded token carries at runtime', () => {
    // AuthTokenPayload's type doesn't declare iat/exp, but a real decoded
    // token has them at runtime (jsonwebtoken merges them in on sign) —
    // this is exactly what reissueAuthTokenPayload must not pass through,
    // or re-signing would throw ("payload already has an exp property").
    const decoded = {
      email: 'user@example.com',
      jti: 'old-jti',
      iat: 1700000000,
      exp: 1700000900,
    } as never;

    const payload = reissueAuthTokenPayload(decoded);

    expect(Object.keys(payload).sort()).toEqual(['email', 'jti']);
  });
});
