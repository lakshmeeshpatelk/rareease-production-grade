/**
 * tests/e2e/accessibility.spec.ts
 * Basic a11y checks: skip link, dialog roles, keyboard nav
 *
 * Run: npx playwright test tests/e2e/accessibility.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility — homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('skip-to-main link is present and becomes visible on focus', async ({ page }) => {
    const skip = page.getByRole('link', { name: /skip to main content/i });
    await expect(skip).toBeAttached();

    // Focus it via keyboard — it should become visible
    await skip.focus();
    await expect(skip).toBeVisible();

    // Clicking it should move focus to #main-content
    await skip.click();
    const mainFocused = await page.evaluate(() =>
      document.activeElement?.id === 'main-content' ||
      document.activeElement?.closest('#main-content') !== null
    );
    expect(mainFocused).toBe(true);
  });

  test('page has exactly one h1', async ({ page }) => {
    const h1s = page.locator('h1');
    const count = await h1s.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(1);
  });

  test('all images have alt text', async ({ page }) => {
    const imgs = page.locator('img');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      // alt="" is valid for decorative images, but must be present
      expect(alt).not.toBeNull();
    }
  });

  test('cart dialog has role=dialog and aria-modal', async ({ page }) => {
    await page.getByRole('button', { name: /open cart/i }).click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    await expect(dialog).toBeVisible();
  });

  test('interactive elements are keyboard reachable', async ({ page }) => {
    // Tab through first 10 elements — should reach a button/link
    const reached: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
      const role = await page.evaluate(() => document.activeElement?.getAttribute('role') ?? '');
      if (['BUTTON', 'A', 'INPUT'].includes(tag) || role === 'button') {
        reached.push(tag || role);
      }
    }
    expect(reached.length).toBeGreaterThan(0);
  });
});
