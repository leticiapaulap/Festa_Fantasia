import { ArrowLeft, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminHeader() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="mb-5 grid gap-3 sm:flex sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/" className="btn-secondary min-h-10 px-3 py-2 normal-case">
          <ArrowLeft className="h-4 w-4" /> Site
        </Link>
        <div>
          <p className="text-sm uppercase text-ember">Halloween</p>
          <h1 className="text-2xl font-black text-white">Área administrativa</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/65">Admin</span>
        <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => { logout(); navigate('/admin'); }}>
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </header>
  );
}
