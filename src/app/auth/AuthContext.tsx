import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  authPath,
  ensureCsrfToken,
  getErrorMessage,
  getLegacyAccessToken,
  http,
  legacyAuthPath,
  setLegacyAccessToken,
} from '../../shared/api/http';
import {
  SegmentoEmpresa,
  type AuthMeResponse,
  type AuthUser,
  type EmpresaContextItem,
} from '../../shared/types/auth';

type AuthContextValue = {
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  roles: string[];
  claims: string[];
  segmentoEmpresa: SegmentoEmpresa;
  isSecuritizadora: boolean;
  contextEmpresas: EmpresaContextItem[];
  selectedEmpresaIds: string[];
  login: (email: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  completeLegacyTwoFactor: (input: CompleteLegacyTwoFactorInput) => Promise<void>;
  generateLegacyTwoFactorQrCode: (email: string, tipoAutenticacao2FA: TwoFactorAuthType) => Promise<string>;
  resendLegacyTwoFactorCode: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateContextSelection: (empresaIds: string[]) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type LegacyError = {
  key?: string;
  value?: string;
};

type LegacyEnvelope<T> = {
  model?: T;
  code?: number;
  success?: boolean;
  errors?: LegacyError[];
  detail?: string;
  message?: string;
};

type LegacyLoginModel = {
  token?: string;
  qrCode?: string;
  requiresTwoFactorCode?: boolean;
  requiresTwoFactorSetup?: boolean;
};

export type TwoFactorAuthType = 1 | 2;

export type LoginResult =
  | { status: 'authenticated' }
  | {
      status: 'two_factor_required';
      challenge: {
        email: string;
        qrCode: string;
        requiresTwoFactorSetup: boolean;
      };
    };

type CompleteLegacyTwoFactorInput = {
  email: string;
  code: string;
  resetKey: boolean;
  tipoAutenticacao2FA: TwoFactorAuthType;
};

type LegacyUserContext = {
  id?: string;
  userId?: string;
  nome?: string;
  name?: string;
  email?: string;
  roles?: string[];
  claims?: string[];
  fidcs?: Array<{
    id: string;
    nome?: string;
    name?: string;
    cnpjCpf?: string;
  }>;
};

const unwrapModel = <T,>(payload: LegacyEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'model' in (payload as LegacyEnvelope<T>)) {
    return (payload as LegacyEnvelope<T>).model as T;
  }

  return payload as T;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const extractClaimsFromJwt = (payload: Record<string, unknown> | null): string[] => {
  if (!payload) {
    return [];
  }

  const ignored = new Set(['aud', 'exp', 'iss', 'nbf', 'iat', 'nameid', 'unique_name', 'sub', 'email', 'name']);
  return Object.entries(payload)
    .filter(([key, value]) => !ignored.has(key) && value !== null && value !== false && value !== 'False')
    .map(([key]) => key);
};

const parseSegmentoEmpresa = (payload: Record<string, unknown> | null): SegmentoEmpresa => {
  const raw = payload?.SegmentoEmpresa;
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) {
    return SegmentoEmpresa.Fidc;
  }

  return (numeric as SegmentoEmpresa) ?? SegmentoEmpresa.Fidc;
};

const parseSelectedEmpresaIdsFromJwt = (payload: Record<string, unknown> | null): string[] => {
  const raw = payload?.FidcContextoRazao;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const mapLegacyEmpresas = (context: LegacyUserContext): EmpresaContextItem[] => {
  return (context.fidcs ?? []).map((item) => ({
    id: item.id,
    nome: item.nome ?? item.name ?? item.id,
    documento: item.cnpjCpf ?? null,
  }));
};

const shouldFallbackToLegacyAuth = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return !status || status === 404 || status === 405 || status === 500;
};

const parseLegacyTwoFactorToken = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const tokenValue = (payload as { token?: string | boolean }).token;
  return typeof tokenValue === 'string' ? tokenValue : '';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [claims, setClaims] = useState<string[]>([]);
  const [segmentoEmpresa, setSegmentoEmpresa] = useState<SegmentoEmpresa>(SegmentoEmpresa.Fidc);
  const [contextEmpresas, setContextEmpresas] = useState<EmpresaContextItem[]>([]);
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<string[]>([]);

  const resetAuth = useCallback(() => {
    setUser(null);
    setRoles([]);
    setClaims([]);
    setSegmentoEmpresa(SegmentoEmpresa.Fidc);
    setContextEmpresas([]);
    setSelectedEmpresaIds([]);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const response = await http.get<AuthMeResponse>(authPath('me'));
      setUser(response.data.user);
      setRoles(response.data.roles);
      setClaims(response.data.claims);
      setSegmentoEmpresa(response.data.segmentoEmpresa ?? SegmentoEmpresa.Fidc);
      setContextEmpresas(response.data.contextoEmpresas?.empresasDisponiveis ?? []);
      setSelectedEmpresaIds(response.data.contextoEmpresas?.empresasSelecionadasIds ?? []);
      return;
    } catch (modernError) {
      const canFallbackFrom401 =
        axios.isAxiosError(modernError) && modernError.response?.status === 401 && !!getLegacyAccessToken();
      if (!canFallbackFrom401 && !shouldFallbackToLegacyAuth(modernError)) {
        resetAuth();
        return;
      }
    }

    try {
      const legacyContextResponse = await http.get<LegacyEnvelope<LegacyUserContext>>('/api/user/get/context');
      const legacyContext = unwrapModel(legacyContextResponse.data);
      const tokenPayload = decodeJwtPayload(getLegacyAccessToken() ?? '');

      const mappedUser: AuthUser = {
        id: legacyContext.id ?? legacyContext.userId ?? 'legacy-user',
        name: legacyContext.nome ?? legacyContext.name ?? legacyContext.email ?? 'Usuário',
        email: legacyContext.email ?? '',
      };

      const mappedRoles = legacyContext.roles ?? [];
      const mappedClaims = legacyContext.claims ?? extractClaimsFromJwt(tokenPayload);
      const mappedEmpresas = mapLegacyEmpresas(legacyContext);
      const selectedByToken = parseSelectedEmpresaIdsFromJwt(tokenPayload);
      const normalizedSelected =
        selectedByToken.length > 0
          ? selectedByToken
          : mappedEmpresas.length === 1
            ? [mappedEmpresas[0].id]
            : [];

      setUser(mappedUser);
      setRoles(mappedRoles);
      setClaims(mappedClaims);
      setSegmentoEmpresa(parseSegmentoEmpresa(tokenPayload));
      setContextEmpresas(mappedEmpresas);
      setSelectedEmpresaIds(normalizedSelected);
    } catch {
      resetAuth();
    }
  }, [resetAuth]);

  const exchangeLegacyTokenAndRefresh = useCallback(async () => {
    const exchangedTokenResponse = await http.post<LegacyEnvelope<string>>(legacyAuthPath('gettoken'), null);
    const exchangedToken = unwrapModel(exchangedTokenResponse.data);
    if (typeof exchangedToken === 'string' && exchangedToken.length > 0) {
      setLegacyAccessToken(exchangedToken);
    }
    await refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      await ensureCsrfToken();
      await http.post(authPath('login'), { email, password, rememberMe });
      await refreshMe();
      return { status: 'authenticated' } satisfies LoginResult;
    } catch (modernError) {
      const isUnauthorized = axios.isAxiosError(modernError) && modernError.response?.status === 401;
      if (!isUnauthorized && !shouldFallbackToLegacyAuth(modernError)) {
        throw new Error(getErrorMessage(modernError));
      }
    }

    try {
      const loginResponse = await http.post<LegacyEnvelope<LegacyLoginModel>>(legacyAuthPath('login'), {
        email,
        password,
        rememberMe,
      });
      const loginModel = unwrapModel(loginResponse.data);
      if (loginModel.requiresTwoFactorCode || loginModel.requiresTwoFactorSetup || loginModel.qrCode) {
        return {
          status: 'two_factor_required',
          challenge: {
            email,
            qrCode: loginModel.qrCode ?? '',
            requiresTwoFactorSetup: !!loginModel.requiresTwoFactorSetup,
          },
        } satisfies LoginResult;
      }

      if (loginModel.token) {
        setLegacyAccessToken(loginModel.token);
      }

      await exchangeLegacyTokenAndRefresh();
      return { status: 'authenticated' } satisfies LoginResult;
    } catch (legacyError) {
      throw new Error(getErrorMessage(legacyError));
    }
  }, [exchangeLegacyTokenAndRefresh, refreshMe]);

  const completeLegacyTwoFactor = useCallback(async (input: CompleteLegacyTwoFactorInput) => {
    const response = await http.post<LegacyEnvelope<unknown>>(legacyAuthPath('validateQrcode'), {
      userEmail: input.email,
      code: input.code,
      resetKey: input.resetKey,
      tipoAutenticacao2FA: input.tipoAutenticacao2FA,
    });
    const model = unwrapModel(response.data);
    const token = parseLegacyTwoFactorToken(model);
    if (!token) {
      throw new Error('Código 2FA inválido.');
    }

    setLegacyAccessToken(token);
    await exchangeLegacyTokenAndRefresh();
  }, [exchangeLegacyTokenAndRefresh]);

  const generateLegacyTwoFactorQrCode = useCallback(async (email: string, tipoAutenticacao2FA: TwoFactorAuthType) => {
    const response = await http.get<LegacyEnvelope<{ qrCode?: string }>>(legacyAuthPath('generateQrCode'), {
      params: { email, tipoAutenticacao2FA },
    });
    const model = unwrapModel(response.data);
    return typeof model?.qrCode === 'string' ? model.qrCode : '';
  }, []);

  const resendLegacyTwoFactorCode = useCallback(async (email: string) => {
    const response = await http.post<LegacyEnvelope<{ reenviado?: boolean }>>(legacyAuthPath('reset-totp'), { email });
    const model = unwrapModel(response.data);
    return !!model?.reenviado;
  }, []);

  const logout = useCallback(async () => {
    try {
      await ensureCsrfToken();
      await http.post(authPath('logout'));
    } catch (modernError) {
      if (shouldFallbackToLegacyAuth(modernError)) {
        await http.post(legacyAuthPath('logout'), null);
      } else {
        throw new Error(getErrorMessage(modernError));
      }
    } finally {
      setLegacyAccessToken(null);
      resetAuth();
    }
  }, [resetAuth]);

  const updateContextSelection = useCallback(async (empresaIds: string[]) => {
    try {
      await ensureCsrfToken();
      await http.put('/contexto/empresas/selecao', { empresaIds });
    } catch (modernError) {
      if (!shouldFallbackToLegacyAuth(modernError)) {
        throw modernError;
      }

      await http.put('/api/fidc/contexto/set', empresaIds);
    }

    await refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await ensureCsrfToken();
      await refreshMe();
      setLoading(false);
    };

    void bootstrap();
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: !!user,
    loading,
    user,
    roles,
    claims,
    segmentoEmpresa,
    isSecuritizadora: segmentoEmpresa === SegmentoEmpresa.Securitizadora,
    contextEmpresas,
    selectedEmpresaIds,
    login,
    completeLegacyTwoFactor,
    generateLegacyTwoFactorQrCode,
    resendLegacyTwoFactorCode,
    logout,
    refreshMe,
    updateContextSelection,
  }), [
    claims,
    contextEmpresas,
    loading,
    login,
    completeLegacyTwoFactor,
    generateLegacyTwoFactorQrCode,
    resendLegacyTwoFactorCode,
    logout,
    refreshMe,
    roles,
    segmentoEmpresa,
    selectedEmpresaIds,
    updateContextSelection,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};
