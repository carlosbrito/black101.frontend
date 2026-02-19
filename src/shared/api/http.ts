import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5287';
export const CONTEXTO_EMPRESA_HEADER = 'X-Contexto-Empresa-Id';

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const ensureCsrfToken = async () => {
  await http.get('/auth/csrf');
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

  return config;
});

export const readCookie = (name: string) => {
  const prefix = `${name}=`;
  const parts = document.cookie.split(';').map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.substring(prefix.length)) : null;
};

export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { detail?: string; message?: string } | undefined;
    return payload?.detail ?? payload?.message ?? 'Não foi possível concluir a operação.';
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
