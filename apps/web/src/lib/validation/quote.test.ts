import { describe, expect, it } from 'vitest';
import { QUOTE_STEPS, quoteFormSchema } from './quote';

const VALID_QUOTE = {
  projectType: 'web-development' as const,
  budgetTier: 'growth' as const,
  timeline: 'flexible' as const,
  details: 'We need a new marketing site with a bespoke customizer.',
  name: 'Jordan Rivera',
  email: 'jordan@example.com',
};

describe('quoteFormSchema', () => {
  it('accepts a fully valid quote submission', () => {
    expect(quoteFormSchema.safeParse(VALID_QUOTE).success).toBe(true);
  });

  it('accepts an optional company field being omitted', () => {
    expect(quoteFormSchema.safeParse(VALID_QUOTE).success).toBe(true);
  });

  it('rejects an out-of-enum projectType', () => {
    const result = quoteFormSchema.safeParse({ ...VALID_QUOTE, projectType: 'not-a-real-type' });
    expect(result.success).toBe(false);
  });

  it('rejects details shorter than 10 characters', () => {
    const result = quoteFormSchema.safeParse({ ...VALID_QUOTE, details: 'too short' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = quoteFormSchema.safeParse({ ...VALID_QUOTE, email: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects a name under 2 characters', () => {
    const result = quoteFormSchema.safeParse({ ...VALID_QUOTE, name: 'A' });
    expect(result.success).toBe(false);
  });
});

describe('QUOTE_STEPS', () => {
  it('captures contact info last, one question per screen, per the product spec', () => {
    const lastStep = QUOTE_STEPS[QUOTE_STEPS.length - 1];
    expect(lastStep?.id).toBe('contact');
    expect(lastStep?.fields).toEqual(['name', 'email', 'company']);
  });

  it('covers every quoteFormSchema field exactly once across all steps', () => {
    const fieldsInSteps = QUOTE_STEPS.flatMap((step) => step.fields).sort();
    const schemaFields = Object.keys(quoteFormSchema.shape).sort();
    expect(fieldsInSteps).toEqual(schemaFields);
  });
});
