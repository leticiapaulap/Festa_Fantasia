import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BackHomeLink } from '../components/BackHomeLink';
import { ParticipantCard } from '../components/ParticipantCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { api, apiMessage, ensureParticipants } from '../services/api';
import type { Participant } from '../types/api';

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Participant[]>('/participants')
      .then(({ data }) => {
        setParticipants(ensureParticipants(data));
      })
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return participants;
    return participants.filter((item) => `${item.name} ${item.costumeName}`.toLowerCase().includes(value));
  }, [participants, query]);

  return (
    <section className="grid gap-5 py-6">
      <BackHomeLink />
      <div className="halloween-card flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-ember">Participantes</p>
          <h1 className="mt-2 text-3xl font-black text-white">Conheça as fantasias</h1>
        </div>
        <label className="relative block min-w-0 w-full sm:max-w-sm">
          <span className="sr-only">Buscar participantes por nome ou fantasia</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" aria-hidden="true" />
          <input
            className="input !pl-14 pr-4 placeholder:text-white/50 hover:border-white/20"
            placeholder="Buscar por nome ou fantasia"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {loading && <SkeletonGrid />}
      {error && <div className="card text-orange-100">{error}</div>}
      {!loading && !error && participants.length === 0 && <div className="card text-white/70">Ainda não há participantes cadastrados.</div>}
      {!loading && !error && participants.length > 0 && filtered.length === 0 && <div className="card text-white/70">Nenhuma fantasia encontrada.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((participant) => <ParticipantCard key={participant.id} participant={participant} />)}
      </div>
    </section>
  );
}
