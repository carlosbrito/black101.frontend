import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5287';
const AUTH_BASE_PATH = import.meta.env.VITE_AUTH_BASE_PATH ?? '/auth';
const LEGACY_AUTH_BASE_PATH = import.meta.env.VITE_LEGACY_AUTH_BASE_PATH ?? '/api/authentication';
const CSRF_ENDPOINT = import.meta.env.VITE_CSRF_ENDPOINT ?? '';
export const CONTEXTO_EMPRESA_HEADER = 'X-Contexto-Empresa-Id';
let legacyAccessToken: string | null = null;

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const ensureCsrfToken = async () => {
  if (!CSRF_ENDPOINT) {
    return;
  }

  await http.get(CSRF_ENDPOINT);
};

http.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const mutating = ['post', 'put', 'patch', 'delete'].includes(method);

  if (mutating) {
    const token = readCookie('XSRF-TOKEN');
    if (token) {
      config.headers['X-CSRF-TOKEN'] = token;
    }
  }

  if (legacyAccessToken && !config.headers.Authorization && !config.headers.authorization) {
    config.headers.Authorization = `Bearer ${legacyAccessToken}`;
  }

  return config;
});

http.interceptors.response.use((response) => {
  const payload = response.data as
    | {
        model?: unknown;
        success?: boolean;
        code?: number;
        errors?: unknown[];
      }
    | undefined;

  if (payload && typeof payload === 'object' && 'model' in payload && ('success' in payload || 'code' in payload || 'errors' in payload)) {
    response.data = payload.model;
  }

  return response;
});

export const authPath = (path: string) => `${AUTH_BASE_PATH}/${path}`.replace(/\/+/g, '/');
export const legacyAuthPath = (path: string) => `${LEGACY_AUTH_BASE_PATH}/${path}`.replace(/\/+/g, '/');

export const setLegacyAccessToken = (token: string | null) => {
  legacyAccessToken = token;
};

export const getLegacyAccessToken = () => legacyAccessToken;

export const readCookie = (name: string) => {
  const prefix = `${name}=`;
  const parts = document.cookie.split(';').map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.substring(prefix.length)) : null;
};

export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as {
      detail?: string;
      message?: string;
      errors?: Array<{ value?: string; message?: string }>;
    } | undefined;
    const firstError = payload?.errors?.[0];
    return firstError?.value ?? firstError?.message ?? payload?.detail ?? payload?.message ?? 'Não foi possível concluir a operação.';
  }

  return 'Não foi possível concluir a operação.';
};

export const requiresEmpresaChoice = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const payload = error.response?.data as { detail?: string; message?: string } | undefined;
  const message = (payload?.detail ?? payload?.message ?? '').toLowerCase();
  return status === 409 && message.includes('mais de uma empresa');
};
