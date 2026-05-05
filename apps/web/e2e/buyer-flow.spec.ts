// Test buyer dashboard and order creation UI (without real auth — use localStorage mock)
import { test, expect } from '@playwright/test';

test.describe('Buyer dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state in localStorage to simulate logged-in buyer
    await page.goto('/');
    await page.evaluate(() => {
      const mockAuthState = {
        state: {
          user: {
            id: 'test-buyer-id',
            role: 'COMPRADOR',
            estado: 'VERIFICADO_ACTIVO',
            nombre: 'Test',
            apellidos: 'Buyer',
            email: 'buyer@test.com',
            empresa_id: 'test-empresa-id',
          },
          accessToken: 'mock-token-that-will-fail-api-calls',
        },
        version: 0,
      };
      localStorage.setItem('auth-storage', JSON.stringify(mockAuthState));
    });
  });

  test('buyer orders page renders tabs', async ({ page }) => {
    await page.goto('/dashboard/buyer/orders');
    await expect(
      page.getByRole('tab', { name: /all/i })
        .or(page.getByText(/All/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('new order form renders product fields', async ({ page }) => {
    await page.goto('/dashboard/buyer/orders/new');
    // Should show the Create New Order form
    await expect(
      page.getByText(/New Order|Create.*Order|Product/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
