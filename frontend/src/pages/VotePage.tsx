import { CheckCircle2, KeyRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BackHomeLink } from '../components/BackHomeLink';
import { Modal } from '../components/Modal';
import { ParticipantCard } from '../components/ParticipantCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { api, apiMessage } from '../services/api';
import type { EventSettings, Participant } from '../types/api';

export function VotePage() {
  const [params] = useSearchParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [code, setCode] = useState(params.get('codigo') ?? '');
  const [selected, setSelected] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([api.get<Participant[]>('/participants'), api.get<EventSettings>('/settings')])
      .then(([people, eventSettings]) => {
        setParticipants(people.data);
        setSettings(eventSettings.data);
      })
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  async function confirmVote() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/votes', { participantId: selected.id, code: normalizedCode });
      setDone(true);
      setSelected(null);
      toast.success('Voto registrado!');
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto grid max-w-xl place-items-center gap-5 py-16 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-300" />
        <h1 className="text-3xl font-black text-white">Voto registrado com sucesso!</h1>
        <p className="text-lg text-white/70">Obrigado por participar.</p>
        <BackHomeLink />
      </section>
    );
  }

  if (!loading && settings?.canAcceptVotes !== true) {
    const closed = settings?.votingAvailability === 'CLOSED' || settings?.votingAvailability === 'AFTER_WINDOW';
    return (
      <section className="mx-auto grid max-w-xl place-items-center gap-5 py-16 text-center">
        <h1 className="text-3xl font-black text-white">{closed ? 'Votação encerrada' : 'Votação ainda não disponível'}</h1>
        <p className="text-lg text-white/70">{closed ? 'Obrigado pela participação.' : 'A votação será liberada durante o evento.'}</p>
        <BackHomeLink />
      </section>
    );
  }

  return (
    <section className="grid gap-5 py-6">
      <BackHomeLink />
      <div className="grid gap-4 md:grid-cols-[1fr_22rem] md:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-ember">Votação</p>
          <h1 className="mt-2 text-3xl font-black text-white">Vote na Melhor Fantasia</h1>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-white/80">
          <span>Código de votação</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-white/45" />
            <input className="input pl-11 uppercase" value={code} onChange={(event) => setCode(event.target.value)} placeholder="FESTA-A7X92" />
          </div>
        </label>
      </div>
      {loading && <SkeletonGrid />}
      {!loading && participants.length === 0 && <div className="card text-white/70">Nenhuma fantasia cadastrada ainda.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            compact
            action={<button className="btn-primary w-full" disabled={!normalizedCode} onClick={() => setSelected(participant)}>Votar nesta fantasia</button>}
          />
        ))}
      </div>
      <Modal open={!!selected} title="Confirmar voto?" onClose={() => setSelected(null)}>
        <div className="grid gap-4">
          <p className="text-white/75">Você está votando em:</p>
          <ParticipantCard participant={selected ?? undefined} compact />
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary" onClick={() => setSelected(null)}>Voltar</button>
            <button className="btn-primary" disabled={submitting} onClick={confirmVote}>{submitting ? 'Confirmando...' : 'Confirmar voto'}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
