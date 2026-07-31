import { describe, expect, it } from 'vitest';
import { loginFormSchema } from './auth';

describe('loginFormSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginFormSchema.safeParse({
      email: 'user@example.com',
      password: 'correct-horse-battery-staple',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginFormSchema.safeParse({
      email: 'not-an-email',
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginFormSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing password field entirely', () => {
    const result = loginFormSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});
