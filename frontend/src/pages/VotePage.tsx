import axios from 'axios';
import { Check, CheckCircle2, Clock3, Sparkles, Users, Vote } from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BackHomeLink } from '../components/BackHomeLink';
import { RankingBoard } from '../components/RankingBoard';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { api, apiMessage } from '../services/api';
import type { Participant, Results, VotingStatus } from '../types/api';

const LIVE_RESULTS_INTERVAL_MS = 10000;

export function VotePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [liveResults, setLiveResults] = useState<Results | null>(null);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const [finalResults, setFinalResults] = useState<Results | null>(null);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');
  const [lastVoteWasTest, setLastVoteWasTest] = useState(false);
  const [tick, setTick] = useState(Date.now());

  const loadStatus = useCallback(async () => {
    const { data } = await api.get<VotingStatus>('/voting/status');
    setStatus(data);
    return data;
  }, []);

  const loadLiveResults = useCallback(async (nextStatus: VotingStatus | null) => {
    if (!nextStatus?.showLiveResults || !['TEST', 'OPEN'].includes(nextStatus.status)) {
      setLiveResults(null);
      setLiveUpdatedAt(null);
      return;
    }
    const { data } = await api.get<Results>('/voting/live-results');
    setLiveResults(data);
    setLiveUpdatedAt(data.updatedAt ?? new Date().toISOString());
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
    }, LIVE_RESULTS_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadFinalResults, loadLiveResults, loadStatus]);

  const target = countdownTarget(status);
  const remaining = target ? Math.max(0, target.getTime() - tick) : 0;
  const canVote = status?.status === 'OPEN' || status?.status === 'TEST';

  useEffect(() => {
    if (status && target && remaining === 0) {
      loadStatus().then((nextStatus) => Promise.all([loadLiveResults(nextStatus), loadFinalResults(nextStatus)])).catch(() => undefined);
    }
  }, [loadFinalResults, loadLiveResults, loadStatus, remaining, status, target]);

  function selectParticipant(participant: Participant) {
    if (done || status?.hasVoted) return;
    setSelected(participant);
    setFormError('');
  }

  async function confirmVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!selected) {
      setFormError('Selecione uma fantasia.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { data } = await api.post<{ testVote?: boolean }>('/votes', { participantId: selected.id });
      setDone(true);
      setLastVoteWasTest(!!data.testVote);
      toast.success(data.testVote ? 'Voto de teste registrado!' : 'Voto registrado!');
      const nextStatus = await loadStatus();
      await loadLiveResults(nextStatus);
    } catch (error) {
      const message = apiMessage(error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setStatus((current) => current ? { ...current, hasVoted: true } : current);
      }
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`mx-auto grid w-full max-w-7xl px-0 ${status?.status === 'WAITING' ? 'gap-4 py-4 sm:gap-4 sm:py-5' : 'gap-6 py-6'}`}>
      <BackHomeLink />

      <header className={`halloween-card rounded-xl ${status?.status === 'WAITING' ? 'p-5 sm:px-7 sm:py-6 lg:p-8' : 'p-5 sm:p-6 lg:p-7'}`}>
        <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between ${status?.status === 'WAITING' ? 'gap-3' : 'gap-5'}`}>
          <div className={status?.status === 'WAITING' ? 'max-w-4xl' : 'max-w-3xl'}>
            <p className="text-sm font-black uppercase tracking-normal text-ember">Halloween</p>
            <h1 className={`font-black uppercase text-white ${status?.status === 'WAITING' ? 'mt-1 text-[1.625rem] leading-[1.08] sm:text-[1.875rem] md:text-[2rem] lg:text-[2.25rem]' : 'mt-2 text-4xl leading-tight sm:text-5xl'}`}>
              {headingForStatus(status)}
            </h1>
            <p className={`${status?.status === 'WAITING' ? 'mt-2 text-sm leading-5 sm:text-base sm:leading-6' : 'mt-3 text-base leading-7 sm:text-lg'} text-white/72`}>
              {descriptionForStatus(status)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status?.status === 'TEST' && <Badge tone="test">Modo teste</Badge>}
            {status?.status === 'OPEN' && <Badge>Votação aberta</Badge>}
            {status?.showLiveResults && ['TEST', 'OPEN'].includes(status.status) && <Badge tone="soft">Parcial ao vivo</Badge>}
            {canVote && <a className="btn-secondary min-h-10 px-3 py-2 text-xs" href="#ranking-ao-vivo">Ver ranking em tempo real</a>}
          </div>
        </div>
        {canVote && <StepRail />}
      </header>

      {loading && <SkeletonGrid />}

      {!loading && status?.status === 'WAITING' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:items-start">
          <StatusCard
            compact
            title="A votação ainda não começou."
            text="A votação será liberada automaticamente no horário configurado pela organização."
            target={status.votingStartsAt}
            tick={tick}
            countdownLabel="Votação começa em"
          />
          <ParticipantsAccessCard compact />
        </div>
      )}

      {!loading && status?.status === 'RESULT_PENDING' && (
        <StatusCard
          title="Votação encerrada."
          text="O resultado final será divulgado no horário configurado."
          target={status.resultsRevealAt}
          tick={tick}
          countdownLabel="Resultado em"
        />
      )}

      {!loading && status?.status === 'CLOSED' && (
        <div className="halloween-card mx-auto w-full max-w-2xl rounded-xl p-6 text-center text-white/75">Votação encerrada. Obrigado pela participação.</div>
      )}

      {!loading && status?.status === 'RESULT_PUBLISHED' && (
        <RankingBoard mode="final" results={finalResults} updatedAt={finalResults?.updatedAt} />
      )}

      {!loading && canVote && status && (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <section className="grid gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase text-ember">1. Escolha uma fantasia</p>
                  <h2 className="text-2xl font-black text-white">Participantes da votação</h2>
                </div>
                <p className="text-sm text-white/55">{participants.length} fantasia{participants.length === 1 ? '' : 's'} disponível{participants.length === 1 ? '' : 'is'}</p>
              </div>

              {participants.length === 0 && <div className="halloween-card rounded-xl p-5 text-white/70">Nenhuma fantasia cadastrada ainda.</div>}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {participants.map((participant) => (
                  <VotingParticipantCard
                    key={participant.id}
                    participant={participant}
                    selected={selected?.id === participant.id}
                    disabled={done || !!status.hasVoted}
                    onSelect={() => selectParticipant(participant)}
                  />
                ))}
              </div>
            </section>

            <ConfirmationPanel
              done={done}
              error={formError}
              lastVoteWasTest={lastVoteWasTest}
              onSubmit={confirmVote}
              onViewResults={() => document.getElementById('ranking-ao-vivo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              selected={selected}
              alreadyVoted={!!status.hasVoted}
              status={status}
              submitting={submitting}
            />
          </div>

          <RankingBoard
            id="ranking-ao-vivo"
            hidden={!status.showLiveResults}
            mode={status.status === 'TEST' ? 'test' : 'live'}
            results={liveResults}
            updatedAt={liveUpdatedAt}
          />
        </>
      )}

      {status?.status !== 'RESULT_PUBLISHED' && status?.status !== 'WAITING' && <ParticipantsAccessCard />}
    </section>
  );
}

function ParticipantsAccessCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="halloween-card flex flex-col justify-between gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <Users className="mt-0.5 h-6 w-6 shrink-0 text-ember" />
          <div className="min-w-0">
            <p className="font-bold text-white">Participantes cadastrados</p>
            <p className="mt-1 text-sm leading-5 text-white/65">Confira quem já está participando.</p>
          </div>
        </div>
        <Link className="btn-secondary min-h-10 shrink-0 px-3 py-2 text-xs" to="/participantes">Ver todos</Link>
      </div>
    );
  }

  return (
    <div className="halloween-card mx-auto w-full max-w-2xl rounded-xl p-5 text-center">
      <Users className="mx-auto h-8 w-8 text-ember" />
      <p className="mt-2 text-white/75">Participantes já cadastrados</p>
      <Link className="btn-secondary mt-4" to="/participantes">Ver participantes</Link>
    </div>
  );
}

function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'soft' | 'test' }) {
  const classes = {
    default: 'border-ember/30 bg-ember/12 text-orange-100',
    soft: 'border-white/12 bg-white/10 text-white/80',
    test: 'border-amber-300/30 bg-amber-300/12 text-amber-100',
  };
  return <span className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${classes[tone]}`}>{children}</span>;
}

function StepRail() {
  const steps = ['Escolher fantasia', 'Confirmar voto'];
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ember text-sm font-black text-night">{index + 1}</span>
          <span className="text-sm font-bold uppercase text-white/80">{step}</span>
        </div>
      ))}
    </div>
  );
}

function VotingParticipantCard({ participant, selected, disabled, onSelect }: { participant: Participant; selected: boolean; disabled: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`halloween-card group grid min-h-full gap-4 rounded-xl p-3 text-left transition duration-300 hover:-translate-y-1 hover:border-ember/55 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-ember/30 sm:p-4 ${
        selected ? 'border-ember bg-ember/12 shadow-glow ring-2 ring-ember/30' : ''
      }`}
    >
      <div className="participant-photo-frame relative aspect-[3/4] w-full rounded-xl">
        {participant.photoUrl ? (
          <img src={participant.photoUrl} alt={participant.costumeName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-14 w-14 text-ember/80" />
          </div>
        )}
        {selected && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-ember px-3 py-2 text-xs font-black uppercase text-night shadow-glow">
            <Check className="h-4 w-4" />
            Selecionado
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <span className={`participant-status ${selected ? 'border-ember/50 bg-ember/12 text-orange-100' : 'border-white/12 bg-white/8 text-white/72'}`}>
          {selected ? 'Selecionado' : 'Pronto para votação'}
        </span>
        <p className="truncate text-sm font-bold uppercase text-white/60">{participant.name}</p>
        <h3 className="mt-1 text-xl font-black leading-tight text-white">{participant.costumeName}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">{participant.description || 'Fantasia misteriosa pronta para surpreender a noite.'}</p>
      </div>
      <span className={selected ? 'btn-primary w-full' : 'btn-secondary w-full'}>{selected ? 'Selecionado' : 'Selecionar'}</span>
    </button>
  );
}

function ConfirmationPanel({
  done,
  error,
  lastVoteWasTest,
  onViewResults,
  onSubmit,
  selected,
  alreadyVoted,
  status,
  submitting,
}: {
  done: boolean;
  error: string;
  lastVoteWasTest: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewResults: () => void;
  selected: Participant | null;
  alreadyVoted: boolean;
  status: VotingStatus;
  submitting: boolean;
}) {
  if (done || alreadyVoted) {
    return (
      <aside className="halloween-card grid gap-4 rounded-xl p-5 text-center xl:sticky xl:top-6">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
        <div>
          <p className="text-sm font-black uppercase text-ember">{alreadyVoted && !done ? 'Você já votou nesta votação.' : 'Voto registrado!'}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{alreadyVoted && !done ? 'Seu voto já foi contabilizado.' : 'Seu voto foi contabilizado com sucesso.'}</h2>
        </div>
        {lastVoteWasTest && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">Voto salvo como teste. Ele não entra no resultado oficial.</p>}
        <button type="button" className="btn-primary w-full" onClick={onViewResults}>
          {alreadyVoted && !done ? 'Ver resultado' : 'Acompanhar resultado'}
        </button>
      </aside>
    );
  }

  return (
    <aside className="halloween-card rounded-xl p-5 xl:sticky xl:top-6">
      <form className="grid gap-5" onSubmit={onSubmit}>
        <div>
          <p className="text-sm font-bold uppercase text-ember">2. Confirmar seu voto</p>
          <h2 className="mt-1 text-2xl font-black text-white">Sua escolha</h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          {selected ? (
            <div className="flex items-center gap-4">
              <div className="participant-photo-frame h-24 w-20 shrink-0 rounded-xl sm:h-32 sm:w-28">
                {selected.photoUrl ? (
                  <img src={selected.photoUrl} alt={selected.costumeName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Sparkles className="h-7 w-7 text-ember" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="participant-status border-ember/35 bg-ember/12 text-orange-100">Sua escolha</span>
                <p className="mt-3 truncate text-sm font-bold uppercase text-white/60">{selected.name}</p>
                <p className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">{selected.costumeName}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-white/60">Selecione uma fantasia no grid para liberar a confirmação.</p>
          )}
        </div>

        {error && <p className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100">{error}</p>}

        <button className="btn-primary min-h-14 w-full text-base" disabled={!selected || submitting || alreadyVoted} type="submit">
          <Vote className="h-5 w-5" />
          {submitting ? 'Registrando voto...' : 'Confirmar voto'}
        </button>

        {!selected && <p className="text-center text-xs font-semibold uppercase text-white/45">Escolha uma fantasia para continuar.</p>}
        {status.status === 'TEST' && <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-center text-xs font-bold uppercase text-amber-100">Votação em modo de teste</p>}
      </form>
    </aside>
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

function descriptionForStatus(status: VotingStatus | null) {
  if (!status) return 'Escolha sua fantasia favorita e acompanhe a votação.';
  return ({
    TEST: 'Teste a votação antes do evento. Os votos daqui ficam separados da votação oficial.',
    WAITING: 'O QR já pode ser usado. A votação abre automaticamente no horário configurado.',
    OPEN: 'Escolha sua fantasia favorita e confirme o voto.',
    CLOSED: 'A votação foi encerrada.',
    RESULT_PENDING: 'A votação foi encerrada. O resultado final será liberado no horário configurado.',
    RESULT_PUBLISHED: 'Confira o ranking oficial divulgado pela organização.',
  })[status.status];
}

function countdownTarget(status: VotingStatus | null) {
  if (status?.status === 'WAITING' && status.votingStartsAt) return new Date(status.votingStartsAt);
  if (status?.status === 'RESULT_PENDING' && status.resultsRevealAt) return new Date(status.resultsRevealAt);
  return null;
}

function StatusCard({ title, text, target, tick, countdownLabel, compact = false }: { title: string; text: string; target?: string | null; tick: number; countdownLabel: string; compact?: boolean }) {
  return (
    <div className={`glass mx-auto grid w-full rounded-lg text-center ${compact ? 'max-w-none gap-4 p-5 sm:p-6' : 'max-w-3xl gap-5 p-6'}`}>
      <Clock3 className={`mx-auto text-ember ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
      <div>
        <h2 className={`font-black text-white ${compact ? 'text-xl sm:text-2xl' : 'text-3xl'}`}>{title}</h2>
        <p className={`text-white/70 ${compact ? 'mt-1 text-sm leading-5' : 'mt-2'}`}>{text}</p>
      </div>
      {target && <Countdown target={target} tick={tick} label={countdownLabel} compact={compact} />}
    </div>
  );
}

function Countdown({ target, tick, label, compact = false }: { target: string; tick: number; label: string; compact?: boolean }) {
  const remaining = Math.max(0, new Date(target).getTime() - tick);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <div>
      <p className={`font-black uppercase text-ember ${compact ? 'mb-2 text-xs sm:text-sm' : 'mb-3 text-sm'}`}>{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TimeBox value={days} label="Dias" compact={compact} />
        <TimeBox value={hours} label="Horas" compact={compact} />
        <TimeBox value={minutes} label="Min" compact={compact} />
        <TimeBox value={seconds} label="Seg" compact={compact} />
      </div>
    </div>
  );
}

function TimeBox({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-black/25 ${compact ? 'p-2 sm:p-2.5' : 'p-3'}`}>
      <p className={`font-black text-white tabular-nums ${compact ? 'text-2xl sm:text-3xl' : 'text-3xl'}`}>{String(value).padStart(2, '0')}</p>
      <p className="text-xs font-bold uppercase text-white/55">{label}</p>
    </div>
  );
}
