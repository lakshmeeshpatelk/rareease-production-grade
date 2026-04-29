/**
 * tests/e2e/cart.spec.ts
 * E2E: cart open/close, focus trap, empty state
 *
 * Run: npx playwright test tests/e2e/cart.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Cart drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('opens and closes via button and Escape key', async ({ page }) => {
    const cartBtn = page.getByRole('button', { name: /open cart/i });
    await cartBtn.click();

    const drawer = page.getByRole('dialog', { name: /shopping cart/i });
    await expect(drawer).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // Reopen and close via button
    await cartBtn.click();
    await expect(drawer).toBeVisible();
    await page.getByRole('button', { name: /close cart/i }).click();
    await expect(drawer).not.toBeVisible();
  });

  test('focus is trapped inside the drawer', async ({ page }) => {
    await page.getByRole('button', { name: /open cart/i }).click();
    const drawer = page.getByRole('dialog', { name: /shopping cart/i });
    await expect(drawer).toBeVisible();

    // Tab more times than there are focusable elements
    for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');

    const activeInDrawer = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Shopping cart"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(activeInDrawer).toBe(true);
  });

  test('empty cart shows empty state message', async ({ page }) => {
    await page.getByRole('button', { name: /open cart/i }).click();
    await expect(page.getByRole('dialog', { name: /shopping cart/i })).toBeVisible();
    await expect(page.getByText(/empty|no items|your cart is/i).first()).toBeVisible();
  });
});
