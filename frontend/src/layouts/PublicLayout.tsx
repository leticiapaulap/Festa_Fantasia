import { Link, Outlet } from 'react-router-dom';
import { Shield, VenetianMask } from 'lucide-react';

export function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-black uppercase text-white">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ember text-night">
            <VenetianMask className="h-5 w-5" />
          </span>
          <span className="truncate">Halloween</span>
        </Link>
        <Link to="/admin" className="rounded-lg border border-white/10 p-3 text-white/75 hover:bg-white/10" aria-label="Admin">
          <Shield className="h-5 w-5" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
