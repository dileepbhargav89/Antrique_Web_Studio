import { describe, expect, it } from 'vitest';
import { contactFormSchema } from './contact';

describe('contactFormSchema', () => {
  it('accepts a valid contact submission without a company', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jordan Rivera',
      email: 'jordan@example.com',
      message: 'I would like to discuss a new project with your team.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a message shorter than 10 characters', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jordan Rivera',
      email: 'jordan@example.com',
      message: 'too short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jordan Rivera',
      email: 'not-an-email',
      message: 'I would like to discuss a new project with your team.',
    });
    expect(result.success).toBe(false);
  });
});
