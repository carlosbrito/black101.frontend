import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ensureCsrfToken, getErrorMessage, http } from '../../shared/api/http';
import type { AuthMeResponse, AuthUser } from '../../shared/types/auth';

type AuthContextValue = {
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  roles: string[];
  claims: string[];
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [claims, setClaims] = useState<string[]>([]);

  const resetAuth = useCallback(() => {
    setUser(null);
    setRoles([]);
    setClaims([]);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const response = await http.get<AuthMeResponse>('/auth/me');
      setUser(response.data.user);
      setRoles(response.data.roles);
      setClaims(response.data.claims);
    } catch {
      resetAuth();
    }
  }, [resetAuth]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    await ensureCsrfToken();
    await http.post('/auth/login', { email, password, rememberMe });
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    try {
      await ensureCsrfToken();
      await http.post('/auth/logout');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      resetAuth();
    }
  }, [resetAuth]);

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
    login,
    logout,
    refreshMe,
  }), [claims, loading, login, logout, refreshMe, roles, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};
