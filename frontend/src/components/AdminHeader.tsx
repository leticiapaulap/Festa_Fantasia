import { ArrowLeft, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminHeader({ testMode = false }: { testMode?: boolean }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="admin-header mb-6 flex flex-col gap-5 rounded-xl border border-white/10 bg-black/25 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember">Halloween</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:text-[30px]">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-white/65 sm:text-base">Gerencie participantes, votação, códigos e resultados.</p>
        <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {testMode && (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100">
            <span className="h-2 w-2 rounded-full bg-amber-300" /> Modo teste ativo
          </span>
        )}
        <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75">
          <span className="h-2 w-2 rounded-full bg-emerald-300" /> Admin
        </span>
        <button className="btn-secondary min-h-10 px-3 py-2 normal-case" onClick={() => { logout(); navigate('/admin'); }}>
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </header>
  );
}
