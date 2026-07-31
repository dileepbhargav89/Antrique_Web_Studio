import { defineConfig, devices } from '@playwright/test';

/**
 * Assumes `apps/api`'s dev server (port 4000) is already running against a migrated +
 * seeded database — Playwright starts `apps/web` only. The CI job wires up both (see
 * `.github/workflows/ci.yml`'s `e2e` job).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial, not parallel: every login hits real Argon2id verification server-side
  // (deliberately CPU-expensive), and concurrent workers starve each other for CPU —
  // observed as flaky >5s waits during Module 12's own local run. CONTRIBUTING.md's
  // "no flaky tests" bar matters more here than wall-clock time on a 6-test suite.
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
