import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_SESSION_EXPIRED_EVENT, api } from '../services/api';
import type { LoginResponse } from '../types/api';

type AuthContextValue = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  bootstrap: (name: string, email: string, password: string, authorizationCode: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));

  useEffect(() => {
    const expireSession = () => setToken(null);
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, expireSession);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/admin/login', { email, password });
    localStorage.setItem('adminToken', data.token);
    setToken(data.token);
  }

  async function bootstrap(name: string, email: string, password: string, authorizationCode: string) {
    const { data } = await api.post<LoginResponse>('/admin/bootstrap', { name, email, password, authorizationCode });
    localStorage.setItem('adminToken', data.token);
    setToken(data.token);
  }

  function logout() {
    localStorage.removeItem('adminToken');
    setToken(null);
  }

  const value = useMemo(() => ({ token, login, bootstrap, logout }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
