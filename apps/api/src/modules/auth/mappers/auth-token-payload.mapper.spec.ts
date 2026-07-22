import { buildAuthTokenPayload, reissueAuthTokenPayload } from './auth-token-payload.mapper';

describe('buildAuthTokenPayload', () => {
  it('builds a payload containing only the email', () => {
    const payload = buildAuthTokenPayload('user@example.com');

    expect(payload).toEqual({ email: 'user@example.com' });
    expect(Object.keys(payload)).toEqual(['email']);
  });

  it('never includes anything beyond the email it was given', () => {
    const payload = buildAuthTokenPayload('user@example.com');

    expect(JSON.stringify(payload)).not.toContain('super-secret');
  });
});

describe('reissueAuthTokenPayload', () => {
  it('rebuilds a clean payload containing only the email', () => {
    const decoded = { email: 'user@example.com' };

    const payload = reissueAuthTokenPayload(decoded);

    expect(payload).toEqual({ email: 'user@example.com' });
    expect(Object.keys(payload)).toEqual(['email']);
  });

  it('strips standard JWT claims (iat/exp) a real decoded token carries at runtime', () => {
    // AuthTokenPayload's type doesn't declare iat/exp, but a real decoded
    // token has them at runtime (jsonwebtoken merges them in on sign) —
    // this is exactly what reissueAuthTokenPayload must not pass through,
    // or re-signing would throw ("payload already has an exp property").
    const decoded = { email: 'user@example.com', iat: 1700000000, exp: 1700000900 } as never;

    const payload = reissueAuthTokenPayload(decoded);

    expect(payload).toEqual({ email: 'user@example.com' });
    expect(Object.keys(payload)).toEqual(['email']);
  });
});
