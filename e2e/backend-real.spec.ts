import { expect, test } from '@playwright/test';

const shouldRunRealBackend = process.env.PLAYWRIGHT_REAL_BACKEND === '1';
const email = process.env.E2E_LOGIN_EMAIL;
const password = process.env.E2E_LOGIN_PASSWORD;

test.describe('Backend Real Smoke', () => {
  test.skip(!shouldRunRealBackend, 'Defina PLAYWRIGHT_REAL_BACKEND=1 para executar contra backend real.');
  test.skip(!email || !password, 'Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para o teste real.');

  test('deve autenticar e acessar rota protegida', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();

    await page.getByLabel('E-mail').fill(email!);
    await page.getByLabel('Senha').fill(password!);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByText('Início')).toBeVisible();
  });
});
