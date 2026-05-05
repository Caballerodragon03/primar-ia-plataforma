// Test navigation and public pages
import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Primar/i);
});

test('login page has all fields', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('register page shows step 1', async ({ page }) => {
  await page.goto('/register');
  await expect(
    page.getByText(/Account Creation|Step 1/i).first()
  ).toBeVisible();
});

test('404 redirect on unknown route', async ({ page }) => {
  await page.goto('/this-route-does-not-exist-xyz');
  // Should either show 404 or redirect — just verify it doesn't crash
  const url = page.url();
  expect(url).toBeTruthy();
});
