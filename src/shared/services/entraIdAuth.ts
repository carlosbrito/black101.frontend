import { PublicClientApplication, type AuthenticationResult, type PopupRequest } from '@azure/msal-browser';

type EntraIdConfig = {
  instance: string;
  tenantId: string;
  clientId: string;
  redirectUri?: string;
  scopes?: string[];
};

const getConfig = (): EntraIdConfig | undefined => {
  const instance = import.meta.env.VITE_ENTRA_ID_INSTANCE?.trim();
  const tenantId = import.meta.env.VITE_ENTRA_ID_TENANT_ID?.trim();
  const clientId = import.meta.env.VITE_ENTRA_ID_CLIENT_ID?.trim();
  const redirectUri = import.meta.env.VITE_ENTRA_ID_REDIRECT_URI?.trim();
  const scopes = import.meta.env.VITE_ENTRA_ID_SCOPES?.split(',')
    .map((value: string) => value.trim())
    .filter(Boolean);

  if (!instance || !tenantId || !clientId) {
    return undefined;
  }

  return {
    instance,
    tenantId,
    clientId,
    redirectUri,
    scopes,
  };
};

const buildAuthority = (instance: string, tenantId: string) => `${instance.replace(/\/+$/, '')}/${tenantId}`;

class EntraIdAuthService {
  private client?: PublicClientApplication;
  private initialization?: Promise<void>;

  hasValidConfiguration() {
    return Boolean(getConfig());
  }

  async loginPopup(): Promise<AuthenticationResult> {
    const client = await this.ensureClient();
    const config = getConfig();
    const request: PopupRequest = {
      scopes: config?.scopes?.length ? config.scopes : ['openid', 'profile', 'email'],
      prompt: 'select_account',
    };

    return client.loginPopup(request);
  }

  async logout(): Promise<void> {
    if (!this.client) {
      return;
    }

    const accounts = this.client.getAllAccounts();
    if (!accounts.length) {
      return;
    }

    await this.client.logoutPopup({ account: accounts[0] });
  }

  private async ensureClient() {
    const config = getConfig();
    if (!config) {
      throw new Error('Integração com Microsoft Entra ID não configurada.');
    }

    if (!this.client) {
      this.client = new PublicClientApplication({
        auth: {
          clientId: config.clientId,
          authority: buildAuthority(config.instance, config.tenantId),
          redirectUri: config.redirectUri || window.location.origin,
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: false,
        },
      });
      this.initialization = this.client.initialize();
    }

    if (this.initialization) {
      await this.initialization;
    }

    return this.client;
  }
}

export const entraIdAuth = new EntraIdAuthService();
