/**
 * Static flag map — no remote flag service wired up (would be an
 * unnecessary dependency for a greenfield app with zero features yet).
 * Swap the object literal for an env-driven or remote-fetched source
 * later without changing any call site, since every flag is read through
 * `isFeatureEnabled()`, not by importing `featureFlags` directly.
 */
const featureFlags = {} as const satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
