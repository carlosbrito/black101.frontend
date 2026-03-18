import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithMicrosoft: vi.fn(),
  completeLegacyTwoFactor: vi.fn(),
  generateLegacyTwoFactorQrCode: vi.fn(),
  resendLegacyTwoFactorCode: vi.fn(),
  sendLegacyEmailTwoFactorCode: vi.fn(),
  getLegacyTwoFactorConfiguration: vi.fn(),
}));

vi.mock('../../app/auth/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../app/auth/AuthContext')>('../../app/auth/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: authMocks.login,
      loginWithMicrosoft: authMocks.loginWithMicrosoft,
      hasMicrosoftSso: true,
      completeLegacyTwoFactor: authMocks.completeLegacyTwoFactor,
      generateLegacyTwoFactorQrCode: authMocks.generateLegacyTwoFactorQrCode,
      resendLegacyTwoFactorCode: authMocks.resendLegacyTwoFactorCode,
      sendLegacyEmailTwoFactorCode: authMocks.sendLegacyEmailTwoFactorCode,
      getLegacyTwoFactorConfiguration: authMocks.getLegacyTwoFactorConfiguration,
    }),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.login.mockResolvedValue({ status: 'authenticated' });
    authMocks.loginWithMicrosoft.mockResolvedValue({ status: 'authenticated' });
    authMocks.completeLegacyTwoFactor.mockResolvedValue(undefined);
    authMocks.generateLegacyTwoFactorQrCode.mockResolvedValue('data:image/png;base64,abc');
    authMocks.resendLegacyTwoFactorCode.mockResolvedValue(true);
    authMocks.sendLegacyEmailTwoFactorCode.mockResolvedValue(undefined);
    authMocks.getLegacyTwoFactorConfiguration.mockResolvedValue([]);
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );

  it('bloqueia envio sem captcha valido', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Conclua a validação do captcha antes de continuar.')).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it('transita para 2fa setup quando o login exigir configuracao', async () => {
    authMocks.login.mockResolvedValue({
      status: 'two_factor_required',
      challenge: {
        email: 'admin@black101.local',
        qrCode: 'data:image/png;base64,abc',
        requiresTwoFactorSetup: true,
      },
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar acesso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Escolha o autenticador para configurar o 2FA.')).toBeInTheDocument();
  });

  it('envia codigo por email quando ha configuracao de autenticadores no legado', async () => {
    authMocks.getLegacyTwoFactorConfiguration.mockResolvedValue([1, 2]);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar acesso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(authMocks.sendLegacyEmailTwoFactorCode).toHaveBeenCalledWith('admin@black101.local');
    });
    expect(await screen.findByText(/Enviamos um código de 6 dígitos/)).toBeInTheDocument();
  });

  it('gera qr ao escolher autenticador no setup', async () => {
    authMocks.login.mockResolvedValue({
      status: 'two_factor_required',
      challenge: {
        email: 'admin@black101.local',
        qrCode: 'data:image/png;base64,abc',
        requiresTwoFactorSetup: true,
      },
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar acesso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    fireEvent.click(await screen.findByRole('button', { name: /Black101 Authenticator/i }));

    await waitFor(() => {
      expect(authMocks.generateLegacyTwoFactorQrCode).toHaveBeenCalledWith('admin@black101.local', 1);
    });
  });

  it('chama reset de autenticador por email a partir do fluxo 2fa', async () => {
    authMocks.login.mockResolvedValue({
      status: 'two_factor_required',
      challenge: {
        email: 'admin@black101.local',
        qrCode: 'data:image/png;base64,abc',
        requiresTwoFactorSetup: false,
      },
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Validar acesso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar código por e-mail' }));

    await waitFor(() => {
      expect(authMocks.resendLegacyTwoFactorCode).toHaveBeenCalledWith('admin@black101.local');
    });
  });

  it('aciona login com microsoft', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Entrar com Microsoft' }));

    await waitFor(() => {
      expect(authMocks.loginWithMicrosoft).toHaveBeenCalledTimes(1);
    });
  });
});
