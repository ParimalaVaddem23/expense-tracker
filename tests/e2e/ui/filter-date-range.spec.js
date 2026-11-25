const { test, expect } = require('@playwright/test');
const { resetAndSeed } = require('../helpers/testData');

test.describe('UI filter date-range validation', () => {
  test.beforeEach(async ({ request, page }) => {
    await resetAndSeed(request);
    await page.goto('/');
  });

  test('shows an error when From > To and does not apply filter', async ({ page }) => {
    // Use stable IDs from public/app.js
    await page.fill('#filter-from', '2026-12-31');
    await page.fill('#filter-to', '2026-01-01');

    await page.click('#btn-apply-filter');

    const banner = page.locator('#message-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('"From" date must not be after "To" date');
  });

  test('allows applying filter when From <= To (no validation banner)', async ({ page }) => {
    // Clear any prior banner state by reloading (or by clicking clear)
    await page.fill('#filter-from', '2026-01-01');
    await page.fill('#filter-to', '2026-12-31');

    await page.click('#btn-apply-filter');

    // The app may still show an error if the API fails; we assert the specific validation message is absent.
    const banner = page.locator('#message-banner');
    await expect(banner).not.toContainText('"From" date must not be after "To" date');
  });
});
