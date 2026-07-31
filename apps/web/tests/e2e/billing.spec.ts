import { expect, test } from '@playwright/test';

/**
 * The "payment" leg of CONTRIBUTING.md §8's "E2E on login/quote/payment" — scoped to
 * what actually exists today. There is no self-serve checkout/hosted-gateway UI
 * anywhere in `apps/web` yet (`apps/api/src/modules/billing/payment.controller.ts`'s
 * own comment: "Real refund processing (hosted-gateway integration) doesn't exist");
 * payments are currently admin-recorded only, and the portal only ever reads them
 * (`features/billing/hooks/use-payments.ts` has no create/pay mutation). Writing an
 * e2e test against a checkout flow that doesn't exist would be fake coverage, so this
 * instead covers the real, live money-facing surface: an authenticated admin viewing
 * an invoice's outstanding balance and issuing it. A true checkout e2e should replace/
 * extend this once a hosted-gateway payment UI is built — tracked as a real, separate
 * product gap, not silently papered over here.
 */
test.describe('Billing — invoice viewing (payment UI does not exist yet)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@antrique.dev');
    await page.getByLabel('Password', { exact: true }).fill('DevAdmin123!');
    await page.getByRole('button', { name: 'Log In' }).click();
    // Real Argon2id verification runs server-side on every login — see login.spec.ts.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('views the invoices list and drills into a seeded invoice', async ({ page }) => {
    await page.goto('/billing/invoices');

    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

    const invoiceLink = page.getByRole('link', { name: /^INV-/ }).first();
    await expect(invoiceLink).toBeVisible();
    await invoiceLink.click();

    // Generous timeout: in Next.js dev mode, a dynamic route not yet hit this dev-server
    // session gets compiled on demand on first navigation, which can take several seconds.
    await expect(page).toHaveURL(/\/billing\/invoices\/.+/, { timeout: 20_000 });
    await expect(page.getByText('Outstanding')).toBeVisible();
    await expect(page.getByText('Line items')).toBeVisible();
  });
});
