import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BackHomeLink() {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ember/40">
      <ArrowLeft className="h-4 w-4" />
      Voltar para página inicial
    </Link>
  );
}
