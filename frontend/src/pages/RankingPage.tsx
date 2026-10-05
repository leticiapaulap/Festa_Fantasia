import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BackHomeLink } from '../components/BackHomeLink';
import { RankingBoard } from '../components/RankingBoard';
import { api, apiMessage } from '../services/api';
import type { Results, VotingStatus } from '../types/api';

const RANKING_REFRESH_MS = 10000;

export function RankingPage() {
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRanking = useCallback(async () => {
    const { data: nextStatus } = await api.get<VotingStatus>('/voting/status');
    setStatus(nextStatus);

    if (nextStatus.status === 'RESULT_PUBLISHED') {
      const { data } = await api.get<Results>('/voting/results');
      setResults(data);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      return;
    }

    if (!nextStatus.showLiveResults || !['TEST', 'OPEN'].includes(nextStatus.status)) {
      setResults(null);
      setUpdatedAt(null);
      return;
    }

    const { data } = await api.get<Results>('/voting/live-results');
    setResults(data);
    setUpdatedAt(data.updatedAt ?? new Date().toISOString());
  }, []);

  useEffect(() => {
    loadRanking()
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [loadRanking]);

  useEffect(() => {
    const id = window.setInterval(() => loadRanking().catch(() => undefined), RANKING_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadRanking]);

  const mode = status?.status === 'TEST' ? 'test' : status?.status === 'RESULT_PUBLISHED' ? 'final' : 'live';
  const canShowBoard = status?.status === 'TEST' || status?.status === 'OPEN' || status?.status === 'RESULT_PUBLISHED';
  const hidden = !!status && !status.showLiveResults && ['TEST', 'OPEN'].includes(status.status);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-0 py-6">
      <BackHomeLink />
      <header className="halloween-card rounded-xl p-5 text-center sm:p-7">
        <p className="text-sm font-black uppercase text-ember">Halloween</p>
        <h1 className="mt-2 text-4xl font-black uppercase leading-tight text-white sm:text-6xl">Ranking</h1>
      </header>

      {loading && <div className="halloween-card rounded-xl p-6 text-center text-white/70">Carregando ranking...</div>}

      {!loading && canShowBoard && (
        <RankingBoard
          hidden={hidden}
          mode={mode}
          results={results}
          updatedAt={updatedAt}
          variant="screen"
        />
      )}

      {!loading && !canShowBoard && !hidden && (
        <div className="halloween-card rounded-xl p-6 text-center text-white/75">Ranking ao vivo disponível durante a votação.</div>
      )}
    </section>
  );
}
