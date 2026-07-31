import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent } from './number';

describe('formatNumber', () => {
  it('formats a large number with locale grouping', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
  });

  it('respects an explicit locale', () => {
    expect(formatNumber(1234567, 'en-US')).toBe('1,234,567');
  });
});

describe('formatPercent', () => {
  it('formats a fraction as a whole-number percent by default', () => {
    expect(formatPercent(0.42)).toBe('42%');
  });

  it('respects requested fraction digits', () => {
    expect(formatPercent(0.4256, 'en-IN', 2)).toBe('42.56%');
  });
});
