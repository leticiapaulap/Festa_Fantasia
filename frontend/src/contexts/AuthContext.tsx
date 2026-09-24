import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { LoginResponse } from '../types/api';

type AuthContextValue = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  bootstrap: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));

  async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/admin/login', { email, password });
    localStorage.setItem('adminToken', data.token);
    setToken(data.token);
  }

  async function bootstrap(name: string, email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/admin/bootstrap', { name, email, password });
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
