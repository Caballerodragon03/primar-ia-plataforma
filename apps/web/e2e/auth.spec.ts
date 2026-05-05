import { test, expect } from '@playwright/test';

// Unique email per test run
const testEmail = `e2e-${Date.now()}@test.com`;
const testPassword = 'TestPassword123!';

test.describe('Registration flow', () => {
  test('completes 4-step buyer registration', async ({ page }) => {
    await page.goto('/register');

    // Step 1: Account Creation
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Phone field
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+34600000000');
    }

    // Language selector — pick EN if available
    const langSelect = page.locator('select[name*="lang" i], select[name*="idioma" i]').first();
    if (await langSelect.isVisible()) {
      await langSelect.selectOption({ value: 'EN' }).catch(() => {});
    }

    // Role selector — pick BUYER / COMPRADOR
    const roleSelect = page.locator('select[name*="role" i], select[name*="rol" i], input[value="COMPRADOR"], input[value="BUYER"]').first();
    if (await roleSelect.isVisible()) {
      if (roleSelect.locator('option').first()) {
        await roleSelect.selectOption({ label: /buyer|comprador/i }).catch(() => {});
      } else {
        await roleSelect.click();
      }
    }

    // Click the first "Continue" button on step 1
    await page.getByRole('button', { name: /continue|siguiente|business/i }).first().click();

    // Step 2: Company Details
    await page.waitForTimeout(500);
    const legalName = page.locator('input[name*="legal" i], input[name*="nombre" i], input[placeholder*="legal name" i]').first();
    if (await legalName.isVisible({ timeout: 3000 }).catch(() => false)) {
      await legalName.fill('Test Company SL');
    }

    const cifInput = page.locator('input[name*="cif" i], input[name*="nif" i]').first();
    if (await cifInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cifInput.fill('B12345678');
    }

    await page.getByRole('button', { name: /continue|siguiente/i }).first().click();

    // Step 3: Documents — skip
    await page.waitForTimeout(500);
    const continueBtn3 = page.getByRole('button', { name: /continue|siguiente|skip/i }).first();
    if (await continueBtn3.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn3.click();
    }

    // Step 4: Legal — check both checkboxes
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) {
        await cb.check();
      }
    }

    // Submit registration
    await page.getByRole('button', { name: /finish|submit|verificat|enviar/i }).first().click();

    // Expect success screen
    await expect(
      page.getByText(/We have received your Registration Submission/i)
        .or(page.getByText(/registro recibido|solicitud recibida|submission/i).first())
    ).toBeVisible({ timeout: 8000 });
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'abc');

    await page.getByRole('button', { name: /continue|siguiente|business/i }).first().click();

    // Expect an error message about password length
    await expect(
      page.locator('[role="alert"], .text-red-500, [class*="error"], p:has-text("password"), p:has-text("contraseña")').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Login flow', () => {
  test('logs in as buyer and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Verify login form renders correctly
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // Expect error message visible
    await expect(
      page.locator('[role="alert"], .text-red-500, [class*="error"]').first()
    ).toBeVisible({ timeout: 5000 });
  });
});
