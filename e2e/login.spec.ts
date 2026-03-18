import { expect, test, type Page, type Route } from '@playwright/test';

const setupLoginApiMock = async (page: Page) => {
  const state = {
    loggedIn: false,
  };

  const csrfHandler = async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax',
      },
      body: JSON.stringify({ token: 'mocked-token' }),
    });
  };

  const modernLoginHandler = async (route: Route) => {
    const body = route.request().postDataJSON() as { password?: string; cloudflareCaptchaToken?: string };
    if (!body.cloudflareCaptchaToken) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Captcha inválido.' }) });
      return;
    }

    if (body.password !== 'Master@5859') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Usuário ou senha inválidos.' }) });
      return;
    }

    state.loggedIn = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  };

  const meHandler = async (route: Route) => {
    if (!state.loggedIn) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'não autenticado' }) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: '1', name: 'Administrador Black101', email: 'admin@black101.local' },
        roles: ['ADMIN'],
        claims: ['CAD_ADM_L'],
        contextoEmpresas: {
          empresasDisponiveis: [{ id: 'empresa-1', nome: 'FIDC Seed', documento: '12345678000199' }],
          empresasSelecionadasIds: ['empresa-1'],
        },
      }),
    });
  };

  await page.route('**/auth/csrf', csrfHandler);
  await page.route('**/auth/login', modernLoginHandler);
  await page.route('**/auth/logout', async (route) => {
    state.loggedIn = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });
  await page.route('**/auth/me', meHandler);

  await page.route('**/authentication/gettoken', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ model: 'legacy-session-token', code: 200 }) });
  });
  await page.route('**/api/authentication/gettoken', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ model: 'legacy-session-token', code: 200 }) });
  });
  await page.route('**/api/user/get/context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: {
          id: '1',
          nome: 'Administrador Black101',
          email: 'admin@black101.local',
          fidcs: [{ id: 'empresa-1', nome: 'FIDC Seed', cnpjCpf: '12345678000199' }],
          roles: ['ADMIN'],
          claims: ['CAD_ADM_L'],
        },
        code: 200,
      }),
    });
  });
  await page.route('**/authentication/two-factor/configuration', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { tiposAtivados: [] }, code: 200 }),
    });
  });
  await page.route('**/authentication/two-factor/email/envio', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { sent: true }, code: 200 }),
    });
  });
  await page.route('**/authentication/generateQrCode**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { qrCode: 'data:image/png;base64,abc123' }, code: 200 }),
    });
  });
  await page.route('**/api/authentication/generateQrCode**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { qrCode: 'data:image/png;base64,abc123' }, code: 200 }),
    });
  });
  await page.route('**/authentication/reset-totp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { reenviado: true }, code: 200 }),
    });
  });
  await page.route('**/api/authentication/reset-totp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { reenviado: true }, code: 200 }),
    });
  });
  await page.route('**/authentication/validateQrcode', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  });
  await page.route('**/api/authentication/validateQrcode', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  });
  await page.route('**/authentication/login-entra', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  });
  await page.route('**/api/authentication/login-entra', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  });
};

test.describe('login', () => {
  test.beforeEach(async ({ page }) => {
    await setupLoginApiMock(page);
  });

  test('login tradicional com captcha', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Validar acesso' }).click();
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Portal Black101')).toBeVisible();
  });

  test('login legado com setup de 2fa e validacao por autenticador', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'not found' }) });
    });
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'not found' }) });
    });
    await page.route('**/api/authentication/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: { requiresTwoFactorCode: true, requiresTwoFactorSetup: true, qrCode: '' },
          code: 200,
        }),
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Validar acesso' }).click();
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'Black101 Authenticator' }).click();
    await expect(page.getByText('Configuração do 2FA')).toBeVisible();
    await page.locator('input[inputmode="numeric"]').fill('123456');
    await page.getByRole('button', { name: 'Validar código' }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test('login via microsoft entra', async ({ page }) => {
    await page.addInitScript(() => {
      window.__BLACK101_ENTRA_LOGIN_POPUP__ = async () => ({
        idToken: 'entra-id-token',
        account: { username: 'admin@black101.local' },
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar com Microsoft' }).click();

    await expect(page).toHaveURL(/\/$/);
  });
});
