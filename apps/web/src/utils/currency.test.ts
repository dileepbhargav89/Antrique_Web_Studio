import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats a plain number as INR by default', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('respects an explicit currency code', () => {
    expect(formatCurrency(1000, 'USD', 'en-US')).toBe('$1,000.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50, 'USD', 'en-US')).toBe('-$50.00');
  });
});
