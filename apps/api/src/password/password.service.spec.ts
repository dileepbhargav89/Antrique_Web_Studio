import { PasswordService } from './password.service';

// hashConfig.KEY is a plain DI token (see @nestjs/config's registerAs()
// typings) — PasswordService takes the resolved config value directly, so a
// plain object stands in for it here. hash()/compare() below call the real
// @node-rs/argon2 native binding, not a mock — env.validation.spec.ts already
// covers the env-parsing rules HASH_* values come from; this test is about
// PasswordService's own hash/compare behavior.
function createPasswordService(overrides: Partial<Record<string, unknown>> = {}) {
  const config = {
    memoryCost: 8192,
    timeCost: 2,
    parallelism: 1,
    ...overrides,
  };
  return new PasswordService(config as never);
}

describe('PasswordService', () => {
  it('hash()/compare() round-trip the same plaintext', async () => {
    const service = createPasswordService();
    const hashed = await service.hash('correct horse battery staple');

    await expect(service.compare('correct horse battery staple', hashed)).resolves.toBe(true);
  });

  it('compare() rejects the wrong plaintext', async () => {
    const service = createPasswordService();
    const hashed = await service.hash('correct horse battery staple');

    await expect(service.compare('wrong password', hashed)).resolves.toBe(false);
  });

  it('hashing the same plaintext twice produces different hashes (random salt per call)', async () => {
    const service = createPasswordService();
    const first = await service.hash('correct horse battery staple');
    const second = await service.hash('correct horse battery staple');

    expect(first).not.toBe(second);
  });

  it('produces an argon2id-encoded hash, not argon2i/argon2d', async () => {
    const service = createPasswordService();
    const hashed = await service.hash('correct horse battery staple');

    expect(hashed.startsWith('$argon2id$')).toBe(true);
  });

  it('encodes the configured memoryCost/timeCost/parallelism into the hash', async () => {
    const service = createPasswordService({ memoryCost: 32768, timeCost: 4, parallelism: 2 });
    const hashed = await service.hash('correct horse battery staple');

    expect(hashed).toContain('m=32768,t=4,p=2');
  });

  it('still verifies a hash produced under a different config (params travel with the hash)', async () => {
    const original = createPasswordService({ memoryCost: 8192, timeCost: 2, parallelism: 1 });
    const hashed = await original.hash('correct horse battery staple');

    const changed = createPasswordService({ memoryCost: 19456, timeCost: 3, parallelism: 2 });
    await expect(changed.compare('correct horse battery staple', hashed)).resolves.toBe(true);
  });
});
