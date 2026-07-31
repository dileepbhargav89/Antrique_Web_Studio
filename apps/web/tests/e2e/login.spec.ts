import { expect, test } from '@playwright/test';

/**
 * Login, one of CONTRIBUTING.md §8's three named E2E flows. Runs against the seeded
 * dev database (`pnpm --filter @antrique/api db:seed`) — `customer@antrique.dev` /
 * `DevCustomer123!` is a fixed, dev-only credential from `apps/api/prisma/seed.ts`,
 * never a real one.
 *
 * Note: `POST /auth/login` is rate-limited to `LOGIN_THROTTLE_LIMIT` (5) attempts per
 * client per minute (`apps/api/src/modules/auth/constants/auth.constant.ts`). Re-running
 * this file repeatedly within the same minute — e.g. while iterating locally — can trip
 * that real limit and turn a "wrong password" 401 into a 429, which the login form's
 * `loginErrorMessage()` doesn't special-case, changing the rendered message. Not a bug in
 * this suite; wait out the window (or use a different seeded user) if it flakes locally.
 */
test.describe('Login', () => {
  test('signs in with valid credentials and reaches the portal dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('customer@antrique.dev');
    await page.getByLabel('Password', { exact: true }).fill('DevCustomer123!');
    await page.getByRole('button', { name: 'Log In' }).click();

    // A generous timeout: real Argon2id password verification runs server-side on every
    // login, and is deliberately slow (that's the point of it) — see
    // `apps/api/src/password/config/hash.config.ts`.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('shows an error and stays on the page for wrong credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('customer@antrique.dev');
    await page.getByLabel('Password', { exact: true }).fill('not-the-real-password');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Scoped past `next-route-announcer__`'s own `role="alert"` live region, which
    // `getByRole('alert')` alone also matches.
    await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('rejects submission with an invalid email before hitting the network', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('anything');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});
