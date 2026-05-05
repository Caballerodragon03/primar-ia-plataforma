// Test seller dashboard and lot publication UI
import { test, expect } from '@playwright/test';

test.describe('Seller dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const mockAuthState = {
        state: {
          user: {
            id: 'test-seller-id',
            role: 'VENDEDOR',
            estado: 'VERIFICADO_ACTIVO',
            nombre: 'Test',
            apellidos: 'Seller',
            email: 'seller@test.com',
            empresa_id: 'test-empresa-id',
          },
          accessToken: 'mock-token',
        },
        version: 0,
      };
      localStorage.setItem('auth-storage', JSON.stringify(mockAuthState));
    });
  });

  test('seller lots page renders', async ({ page }) => {
    await page.goto('/dashboard/seller/lots');
    await expect(page.getByText(/My Lots/i)).toBeVisible({ timeout: 5000 });
  });

  test('publish lot form has caliber fields', async ({ page }) => {
    await page.goto('/dashboard/seller/lots/new');
    await expect(
      page.getByText(/Publish.*Lot|New Lot|Product/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('matches page renders', async ({ page }) => {
    await page.goto('/dashboard/seller/matches');
    await expect(
      page.getByText(/Matching Orders|Best Match|No matching/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
