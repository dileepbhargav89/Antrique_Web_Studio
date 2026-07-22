import {
  DEFAULT_RETRY_POLICY,
  delayBeforeNextAttemptMs,
  hasAttemptsRemaining,
} from './retry-policy';

describe('retry-policy', () => {
  describe('delayBeforeNextAttemptMs', () => {
    it('doubles the delay each attempt (exponential backoff)', () => {
      const policy = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 10_000 };
      expect(delayBeforeNextAttemptMs(policy, 1)).toBe(100);
      expect(delayBeforeNextAttemptMs(policy, 2)).toBe(200);
      expect(delayBeforeNextAttemptMs(policy, 3)).toBe(400);
    });

    it('caps the delay at maxDelayMs', () => {
      const policy = { maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 5000 };
      expect(delayBeforeNextAttemptMs(policy, 10)).toBe(5000);
    });
  });

  describe('hasAttemptsRemaining', () => {
    it('returns true while attempt is below maxAttempts', () => {
      expect(hasAttemptsRemaining(DEFAULT_RETRY_POLICY, 1)).toBe(true);
      expect(hasAttemptsRemaining(DEFAULT_RETRY_POLICY, 2)).toBe(true);
    });

    it('returns false once attempt reaches maxAttempts', () => {
      expect(hasAttemptsRemaining(DEFAULT_RETRY_POLICY, DEFAULT_RETRY_POLICY.maxAttempts)).toBe(
        false,
      );
    });
  });
});
