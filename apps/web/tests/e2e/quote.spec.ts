import { expect, test } from '@playwright/test';

/**
 * Quote request, one of CONTRIBUTING.md §8's three named E2E flows. Walks the real
 * five-step wizard (`(marketing)/quote/quote-wizard.tsx`) end to end — one question per
 * screen, contact captured last, real submit to `/api/quote`.
 */
test.describe('Quote request', () => {
  test('completes all five steps and reaches the success state', async ({ page }) => {
    await page.goto('/quote');

    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Web Development' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Growth' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Step 3 of 5')).toBeVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Flexible' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Step 4 of 5')).toBeVisible();
    await page
      .getByPlaceholder(/what are you building/i)
      .fill('We need a new marketing site with a bespoke product customizer.');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Step 5 of 5')).toBeVisible();
    await page.getByLabel('Name', { exact: true }).fill('Jordan Rivera');
    await page.getByLabel('Email', { exact: true }).fill('jordan.e2e@example.com');
    await page.getByRole('button', { name: 'Submit Request' }).click();

    // Scoped past the submit button's own `role="status"` Spinner (visible while
    // submitting), which `getByRole('status')` alone also matches.
    await expect(page.getByText(/thanks — your request is in/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('blocks advancing past a step until it is answered', async ({ page }) => {
    await page.goto('/quote');

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Step 1 of 5')).toBeVisible();
  });
});
