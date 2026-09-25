import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHomeLink } from '../components/BackHomeLink';
import { ParticipantCard } from '../components/ParticipantCard';
import { api, apiMessage } from '../services/api';
import type { Results } from '../types/api';

export function ResultPage() {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Results>('/results')
      .then(({ data }) => {
        setResults(data);
        if (data.resultsPublic && data.winners.length > 0) {
          confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 } });
        }
      })
      .catch((err) => setError(apiMessage(err)));
  }, []);

  if (error) return <PageShell><div className="card text-orange-100">{error}</div></PageShell>;
  if (!results) return <PageShell><div className="card text-white/70">Carregando resultado...</div></PageShell>;
  if (!results.resultsPublic) return <PageShell><div className="card text-center text-xl text-white">A votação ainda está acontecendo.</div></PageShell>;

  return (
    <PageShell>
      <div className="text-center">
        <Trophy className="mx-auto h-14 w-14 text-ember" />
        <p className="mt-3 text-sm font-bold uppercase text-ember">{results.tie ? 'Temos um empate!' : 'Melhor fantasia da noite'}</p>
        <h1 className="mt-2 text-3xl font-black text-white">Resultado Final</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.winners.map((winner) => <ParticipantCard key={winner.participantId} ranking={winner} />)}
      </div>
      <div className="card">
        <h2 className="mb-4 text-xl font-bold text-white">Ranking final</h2>
        <div className="grid gap-3">
          {results.ranking.map((item, index) => (
            <div key={item.participantId} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-white">{index + 1}º {item.costumeName} — {item.participantName}</span>
                <span className="text-white/70">{item.votes} votos</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-ember" style={{ width: `${Math.min(100, item.percentage)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <section className="grid gap-6 py-6">
      <BackHomeLink />
      {children}
    </section>
  );
}
