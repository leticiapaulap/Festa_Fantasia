import { type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  if (!token) return <Navigate to="/admin" replace />;
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase text-ember">Painel da Festa</p>
            <h1 className="text-2xl font-black text-white">Administração</h1>
          </div>
          <button className="btn-secondary" onClick={() => { logout(); navigate('/admin'); }}>
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
