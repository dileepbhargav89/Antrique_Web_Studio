import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, isValidDate } from './date';

describe('formatDate', () => {
  it('formats an ISO string as a medium date', () => {
    expect(formatDate('2026-01-15T10:00:00Z')).toBe('15 Jan 2026');
  });

  it('formats a Date instance identically to the equivalent ISO string', () => {
    expect(formatDate(new Date('2026-01-15T10:00:00Z'))).toBe(formatDate('2026-01-15T10:00:00Z'));
  });
});

describe('formatDateTime', () => {
  it('includes both date and time', () => {
    const result = formatDateTime('2026-01-15T10:30:00Z');
    expect(result).toContain('2026');
    expect(result.length).toBeGreaterThan(formatDate('2026-01-15T10:30:00Z').length);
  });
});

describe('isValidDate', () => {
  it('accepts a real Date instance', () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  it('rejects an invalid Date instance', () => {
    expect(isValidDate(new Date('not-a-date'))).toBe(false);
  });

  it('rejects non-Date values', () => {
    expect(isValidDate('2026-01-15')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});
