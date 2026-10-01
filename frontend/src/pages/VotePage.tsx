import { CheckCircle2, Clock3, KeyRound, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BackHomeLink } from '../components/BackHomeLink';
import { Modal } from '../components/Modal';
import { ParticipantCard } from '../components/ParticipantCard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { api, apiMessage } from '../services/api';
import type { Participant, RankingItem, Results, VotingStatus } from '../types/api';

export function VotePage() {
  const [params] = useSearchParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [liveResults, setLiveResults] = useState<Results | null>(null);
  const [finalResults, setFinalResults] = useState<Results | null>(null);
  const [code, setCode] = useState(params.get('codigo') ?? '');
  const [selected, setSelected] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [tick, setTick] = useState(Date.now());

  const loadStatus = useCallback(async () => {
    const { data } = await api.get<VotingStatus>('/voting/status');
    setStatus(data);
    return data;
  }, []);

  const loadLiveResults = useCallback(async (nextStatus: VotingStatus | null) => {
    if (!nextStatus?.showLiveResults || !['TEST', 'OPEN'].includes(nextStatus.status)) {
      setLiveResults(null);
      return;
    }
    const { data } = await api.get<Results>('/voting/live-results');
    setLiveResults(data);
  }, []);

  const loadFinalResults = useCallback(async (nextStatus: VotingStatus | null) => {
    if (nextStatus?.status !== 'RESULT_PUBLISHED') {
      setFinalResults(null);
      return;
    }
    const { data } = await api.get<Results>('/voting/results');
    setFinalResults(data);
  }, []);

  useEffect(() => {
    Promise.all([api.get<Participant[]>('/participants'), loadStatus()])
      .then(async ([people, nextStatus]) => {
        setParticipants(people.data);
        await Promise.all([loadLiveResults(nextStatus), loadFinalResults(nextStatus)]);
      })
      .catch((error) => toast.error(apiMessage(error)))
      .finally(() => setLoading(false));
  }, [loadFinalResults, loadLiveResults, loadStatus]);

  useEffect(() => {
    const clock = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const nextStatus = await loadStatus().catch(() => null);
      if (nextStatus) await Promise.all([loadLiveResults(nextStatus), loadFinalResults(nextStatus)]).catch(() => undefined);
    }, 12000);
    return () => window.clearInterval(id);
  }, [loadFinalResults, loadLiveResults, loadStatus]);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);
  const target = countdownTarget(status);
  const remaining = target ? Math.max(0, target.getTime() - tick) : 0;

  useEffect(() => {
    if (status && target && remaining === 0) {
      loadStatus().then((nextStatus) => Promise.all([loadLiveResults(nextStatus), loadFinalResults(nextStatus)])).catch(() => undefined);
    }
  }, [loadFinalResults, loadLiveResults, loadStatus, remaining, status, target]);

  async function confirmVote() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<{ testVote?: boolean }>('/votes', { participantId: selected.id, code: normalizedCode });
      setDone(true);
      setSelected(null);
      toast.success(data.testVote ? 'Voto de teste registrado!' : 'Voto registrado!');
      const nextStatus = await loadStatus();
      await loadLiveResults(nextStatus);
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
        {status?.votingTestMode && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">Votação em modo de teste.</p>}
        <button className="btn-secondary" onClick={() => setDone(false)}>Votar novamente</button>
        <BackHomeLink />
      </section>
    );
  }

  const canVote = status?.status === 'OPEN' || status?.status === 'TEST';

  return (
    <section className="grid gap-5 py-6">
      <BackHomeLink />
      <div className="grid gap-2 text-center">
        <p className="text-sm font-bold uppercase text-ember">Halloween</p>
        <h1 className="text-3xl font-black uppercase text-white">{headingForStatus(status)}</h1>
        {status?.status === 'TEST' && <p className="mx-auto w-fit rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-bold uppercase text-amber-100">Votação em modo de teste</p>}
      </div>

      {loading && <SkeletonGrid />}

      {!loading && status?.status === 'WAITING' && (
        <StatusCard
          title="A votação ainda não começou."
          text="A votação será liberada automaticamente no horário configurado pela organização."
          target={status.votingStartsAt}
          tick={tick}
        />
      )}

      {!loading && status?.status === 'RESULT_PENDING' && (
        <StatusCard
          title="Votação encerrada."
          text="O resultado final será divulgado no horário configurado."
          target={status.resultsRevealAt}
          tick={tick}
        />
      )}

      {!loading && status?.status === 'CLOSED' && (
        <div className="card mx-auto max-w-xl text-center text-white/75">Votação encerrada. Obrigado pela participação.</div>
      )}

      {!loading && status?.status === 'RESULT_PUBLISHED' && (
        <FinalResults results={finalResults} />
      )}

      {!loading && canVote && (
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_22rem] md:items-end">
            <div>
              <p className="text-lg text-white/75">{status.status === 'TEST' ? 'Teste o fluxo sem afetar a votação oficial.' : 'Escolha sua fantasia favorita.'}</p>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-white/80">
              <span>Código de votação</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-white/45" />
                <input className="input pl-11 uppercase" value={code} onChange={(event) => setCode(event.target.value)} placeholder="FESTA-A7X92" />
              </div>
            </label>
          </div>
          {participants.length === 0 && <div className="card text-white/70">Nenhuma fantasia cadastrada ainda.</div>}
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
          {status.showLiveResults && <LiveResults results={liveResults} />}
        </>
      )}

      {status?.status !== 'RESULT_PUBLISHED' && (
        <div className="card mx-auto w-full max-w-xl text-center">
          <Users className="mx-auto h-8 w-8 text-ember" />
          <p className="mt-2 text-white/75">Participantes já cadastrados</p>
          <Link className="btn-secondary mt-4" to="/participantes">Ver participantes</Link>
        </div>
      )}

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

function headingForStatus(status: VotingStatus | null) {
  if (!status) return 'Votação';
  return ({
    TEST: 'Votação em teste',
    WAITING: 'Votação ainda não iniciada',
    OPEN: 'Votação aberta',
    CLOSED: 'Votação encerrada',
    RESULT_PENDING: 'Resultado em breve',
    RESULT_PUBLISHED: 'Resultado final',
  })[status.status];
}

function countdownTarget(status: VotingStatus | null) {
  if (status?.status === 'WAITING' && status.votingStartsAt) return new Date(status.votingStartsAt);
  if (status?.status === 'RESULT_PENDING' && status.resultsRevealAt) return new Date(status.resultsRevealAt);
  return null;
}

function StatusCard({ title, text, target, tick }: { title: string; text: string; target?: string | null; tick: number }) {
  return (
    <div className="card mx-auto grid w-full max-w-2xl gap-5 text-center">
      <Clock3 className="mx-auto h-10 w-10 text-ember" />
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-2 text-white/70">{text}</p>
      </div>
      {target && <Countdown target={target} tick={tick} />}
    </div>
  );
}

function Countdown({ target, tick }: { target: string; tick: number }) {
  const remaining = Math.max(0, new Date(target).getTime() - tick);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <div>
      <p className="mb-3 text-sm font-bold uppercase text-ember">Começa em</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TimeBox value={days} label="Dias" />
        <TimeBox value={hours} label="Horas" />
        <TimeBox value={minutes} label="Min" />
        <TimeBox value={seconds} label="Seg" />
      </div>
    </div>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <p className="text-3xl font-black text-white tabular-nums">{String(value).padStart(2, '0')}</p>
      <p className="text-xs font-bold uppercase text-white/55">{label}</p>
    </div>
  );
}

function LiveResults({ results }: { results: Results | null }) {
  return (
    <div className="card grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-ember">Resultado parcial</p>
          <h2 className="text-2xl font-black text-white">Votos atuais</h2>
        </div>
        <p className="text-sm text-white/55">Última atualização: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
      </div>
      <RankingList items={results?.ranking ?? []} totalVotes={results?.totalVotes ?? 0} partial />
    </div>
  );
}

function FinalResults({ results }: { results: Results | null }) {
  return (
    <div className="grid gap-5">
      <div className="text-center">
        <Trophy className="mx-auto h-14 w-14 text-ember" />
        <p className="mt-3 text-sm font-bold uppercase text-ember">{results?.tie ? 'Empate no primeiro lugar' : 'Resultado final'}</p>
        <h2 className="mt-2 text-3xl font-black text-white">Halloween</h2>
      </div>
      <div className="card">
        <RankingList items={results?.ranking ?? []} totalVotes={results?.totalVotes ?? 0} final />
      </div>
    </div>
  );
}

function RankingList({ items, totalVotes, partial, final }: { items: RankingItem[]; totalVotes: number; partial?: boolean; final?: boolean }) {
  if (items.length === 0) return <p className="text-white/65">Ainda não há votos.</p>;
  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const tied = item.votes > 0 && items.some((other, otherIndex) => otherIndex !== index && other.votes === item.votes);
        return (
          <div key={item.participantId} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-white">{final && index < 3 ? medalFor(index) : `${index + 1}.`} {item.costumeName}</span>
              <span className="text-white/70">{item.votes} votos</span>
            </div>
            <p className="mt-1 text-sm text-white/55">{item.participantName}{tied && ' · Empate'}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-ember" style={{ width: `${Math.min(100, item.percentage)}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-white/50">{totalVotes ? item.percentage.toFixed(1) : '0.0'}%</p>
            {partial && index === 0 && <p className="mt-2 text-xs font-semibold uppercase text-white/45">Resultado parcial, sem vencedor declarado.</p>}
          </div>
        );
      })}
    </div>
  );
}

function medalFor(index: number) {
  return ['1º lugar', '2º lugar', '3º lugar'][index] ?? `${index + 1}.`;
}
