import { test, expect } from '@playwright/test';

test('has title and can see main header', async ({ page }) => {
  // Go to the app
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/NEXA15/i);
  
  // You can test specific elements like this once the app is loaded.
  // Wait for the app to finish loading or check for a specific header
  // e.g. await expect(page.locator('h1').first()).toBeVisible();
});

test('can navigate to login or specific feature', async ({ page }) => {
  await page.goto('/');
  // Add actual locators matching your app to click around
  // e.g., await page.click('text=Login');
  // await expect(page).toHaveURL(/.*login/);
});
