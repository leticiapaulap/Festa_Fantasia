import { Check, CheckCircle2, Clock3, KeyRound, Sparkles, Trophy, Users, Vote } from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BackHomeLink } from '../components/BackHomeLink';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { api, apiMessage } from '../services/api';
import type { Participant, RankingItem, Results, VotingStatus } from '../types/api';

const LIVE_RESULTS_INTERVAL_MS = 12000;

export function VotePage() {
  const [params] = useSearchParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [liveResults, setLiveResults] = useState<Results | null>(null);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const [finalResults, setFinalResults] = useState<Results | null>(null);
  const [code, setCode] = useState(params.get('codigo') ?? '');
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
    setLiveUpdatedAt(new Date().toISOString());
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

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);
  const target = countdownTarget(status);
  const remaining = target ? Math.max(0, target.getTime() - tick) : 0;
  const canVote = status?.status === 'OPEN' || status?.status === 'TEST';

  useEffect(() => {
    if (status && target && remaining === 0) {
      loadStatus().then((nextStatus) => Promise.all([loadLiveResults(nextStatus), loadFinalResults(nextStatus)])).catch(() => undefined);
    }
  }, [loadFinalResults, loadLiveResults, loadStatus, remaining, status, target]);

  function selectParticipant(participant: Participant) {
    setSelected(participant);
    setDone(false);
    setFormError('');
  }

  async function confirmVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!selected) {
      setFormError('Selecione uma fantasia.');
      return;
    }
    if (!normalizedCode) {
      setFormError('Informe o código de votação.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = { participantId: selected.id, code: normalizedCode };
      const { data } = await api.post<{ testVote?: boolean }>('/votes', payload);
      setDone(true);
      setLastVoteWasTest(!!data.testVote);
      setCode('');
      toast.success(data.testVote ? 'Voto de teste registrado!' : 'Voto registrado!');
      const nextStatus = await loadStatus();
      await loadLiveResults(nextStatus);
    } catch (error) {
      const message = apiMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetVoteFlow() {
    setDone(false);
    setSelected(null);
    setCode('');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-0 py-6">
      <BackHomeLink />

      <header className="glass rounded-lg p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-normal text-ember">Halloween</p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-tight text-white sm:text-5xl">{headingForStatus(status)}</h1>
            <p className="mt-3 text-base leading-7 text-white/72 sm:text-lg">{descriptionForStatus(status)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status?.status === 'TEST' && <Badge tone="test">Modo teste</Badge>}
            {status?.status === 'OPEN' && <Badge>Votação aberta</Badge>}
            {status?.showLiveResults && ['TEST', 'OPEN'].includes(status.status) && <Badge tone="soft">Parcial ao vivo</Badge>}
          </div>
        </div>
        {canVote && <StepRail />}
      </header>

      {loading && <SkeletonGrid />}

      {!loading && status?.status === 'WAITING' && (
        <StatusCard
          title="A votação ainda não começou."
          text="A votação será liberada automaticamente no horário configurado pela organização."
          target={status.votingStartsAt}
          tick={tick}
          countdownLabel="Votação começa em"
        />
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
        <div className="glass mx-auto w-full max-w-2xl rounded-lg p-6 text-center text-white/75">Votação encerrada. Obrigado pela participação.</div>
      )}

      {!loading && status?.status === 'RESULT_PUBLISHED' && (
        <FinalResults results={finalResults} />
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

              {participants.length === 0 && <div className="glass rounded-lg p-5 text-white/70">Nenhuma fantasia cadastrada ainda.</div>}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {participants.map((participant) => (
                  <VotingParticipantCard
                    key={participant.id}
                    participant={participant}
                    selected={selected?.id === participant.id}
                    onSelect={() => selectParticipant(participant)}
                  />
                ))}
              </div>
            </section>

            <ConfirmationPanel
              code={code}
              done={done}
              error={formError}
              lastVoteWasTest={lastVoteWasTest}
              normalizedCode={normalizedCode}
              onCodeChange={(value) => {
                setCode(value);
                setFormError('');
              }}
              onReset={resetVoteFlow}
              onSubmit={confirmVote}
              selected={selected}
              status={status}
              submitting={submitting}
            />
          </div>

          {status.showLiveResults && <LiveResults results={liveResults} updatedAt={liveUpdatedAt} />}
        </>
      )}

      {status?.status !== 'RESULT_PUBLISHED' && (
        <div className="glass mx-auto w-full max-w-2xl rounded-lg p-5 text-center">
          <Users className="mx-auto h-8 w-8 text-ember" />
          <p className="mt-2 text-white/75">Participantes já cadastrados</p>
          <Link className="btn-secondary mt-4" to="/participantes">Ver participantes</Link>
        </div>
      )}
    </section>
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
  const steps = ['Escolher', 'Código', 'Confirmar', 'Resultado'];
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ember text-sm font-black text-night">{index + 1}</span>
          <span className="text-sm font-bold uppercase text-white/80">{step}</span>
        </div>
      ))}
    </div>
  );
}

function VotingParticipantCard({ participant, selected, onSelect }: { participant: Participant; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`glass group grid min-h-full gap-4 rounded-lg p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-ember/55 focus:outline-none focus:ring-2 focus:ring-ember/30 ${
        selected ? 'border-ember bg-ember/10 shadow-glow ring-2 ring-ember/25' : ''
      }`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-gradient-to-br from-velvet/45 via-black/30 to-ember/25">
        {participant.photoUrl ? (
          <img src={participant.photoUrl} alt={participant.costumeName} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-white/72">{participant.name}</p>
        <h3 className="mt-1 text-xl font-black leading-tight text-white">{participant.costumeName}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">{participant.description || 'Fantasia misteriosa pronta para surpreender a noite.'}</p>
      </div>
      <span className={selected ? 'btn-primary w-full' : 'btn-secondary w-full'}>{selected ? 'Selecionado' : 'Selecionar'}</span>
    </button>
  );
}

function ConfirmationPanel({
  code,
  done,
  error,
  lastVoteWasTest,
  normalizedCode,
  onCodeChange,
  onReset,
  onSubmit,
  selected,
  status,
  submitting,
}: {
  code: string;
  done: boolean;
  error: string;
  lastVoteWasTest: boolean;
  normalizedCode: string;
  onCodeChange: (value: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selected: Participant | null;
  status: VotingStatus;
  submitting: boolean;
}) {
  if (done) {
    return (
      <aside className="glass grid gap-4 rounded-lg p-5 text-center xl:sticky xl:top-6">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
        <div>
          <p className="text-sm font-black uppercase text-ember">Voto registrado!</p>
          <h2 className="mt-1 text-2xl font-black text-white">Seu voto foi contabilizado com sucesso.</h2>
        </div>
        {lastVoteWasTest && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">Voto salvo como teste. Ele não entra no resultado oficial.</p>}
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => document.getElementById('resultado-parcial')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Ver resultado parcial
        </button>
        <button type="button" className="btn-secondary w-full" onClick={onReset}>Voltar para o início</button>
      </aside>
    );
  }

  return (
    <aside className="glass rounded-lg p-5 xl:sticky xl:top-6">
      <form className="grid gap-5" onSubmit={onSubmit}>
        <div>
          <p className="text-sm font-bold uppercase text-ember">2. Confirmar seu voto</p>
          <h2 className="mt-1 text-2xl font-black text-white">Sua escolha</h2>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
          {selected ? (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
                {selected.photoUrl ? (
                  <img src={selected.photoUrl} alt={selected.costumeName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Sparkles className="h-7 w-7 text-ember" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-white/60">{selected.name}</p>
                <p className="truncate text-lg font-black text-white">{selected.costumeName}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-white/60">Selecione uma fantasia no grid para liberar a confirmação.</p>
          )}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-white/80">
          <span>Código de votação</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-white/45" />
            <input
              className="input pl-11 uppercase"
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder="FESTA-A7X92"
              autoComplete="one-time-code"
            />
          </div>
        </label>

        {error && <p className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100">{error}</p>}

        <button className="btn-primary min-h-14 w-full text-base" disabled={!selected || submitting} type="submit">
          <Vote className="h-5 w-5" />
          {submitting ? 'Registrando voto...' : 'Confirmar voto'}
        </button>

        {!selected && <p className="text-center text-xs font-semibold uppercase text-white/45">Escolha uma fantasia para continuar.</p>}
        {selected && !normalizedCode && <p className="text-center text-xs font-semibold uppercase text-white/45">Informe o código antes de confirmar.</p>}
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
    OPEN: 'Escolha sua fantasia favorita, informe seu código e confirme o voto.',
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

function StatusCard({ title, text, target, tick, countdownLabel }: { title: string; text: string; target?: string | null; tick: number; countdownLabel: string }) {
  return (
    <div className="glass mx-auto grid w-full max-w-3xl gap-5 rounded-lg p-6 text-center">
      <Clock3 className="mx-auto h-10 w-10 text-ember" />
      <div>
        <h2 className="text-3xl font-black text-white">{title}</h2>
        <p className="mt-2 text-white/70">{text}</p>
      </div>
      {target && <Countdown target={target} tick={tick} label={countdownLabel} />}
    </div>
  );
}

function Countdown({ target, tick, label }: { target: string; tick: number; label: string }) {
  const remaining = Math.max(0, new Date(target).getTime() - tick);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <div>
      <p className="mb-3 text-sm font-black uppercase text-ember">{label}</p>
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

function LiveResults({ results, updatedAt }: { results: Results | null; updatedAt: string | null }) {
  const totalVotes = results?.totalVotes ?? 0;
  return (
    <section id="resultado-parcial" className="glass grid gap-5 rounded-lg p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-ember">Resultado parcial</p>
          <h2 className="mt-1 text-3xl font-black text-white">Votos atuais</h2>
          <p className="mt-2 text-sm text-white/60">Resultado parcial, sem vencedor declarado.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-bold text-white/70">{totalVotes} voto{totalVotes === 1 ? '' : 's'} computado{totalVotes === 1 ? '' : 's'}</p>
          <p className="text-sm text-white/50">Última atualização: {updatedAt ? formatTime(updatedAt) : '--:--:--'}</p>
        </div>
      </div>
      <RankingList items={results?.ranking ?? []} totalVotes={totalVotes} variant="partial" />
    </section>
  );
}

function FinalResults({ results }: { results: Results | null }) {
  return (
    <div className="grid gap-5">
      <div className="text-center">
        <Trophy className="mx-auto h-14 w-14 text-ember" />
        <p className="mt-3 text-sm font-black uppercase text-ember">{results?.tie ? 'Empate no primeiro lugar' : 'Resultado final'}</p>
        <h2 className="mt-2 text-4xl font-black text-white">Halloween</h2>
      </div>
      <section className="glass rounded-lg p-5 sm:p-6">
        <RankingList items={results?.ranking ?? []} totalVotes={results?.totalVotes ?? 0} variant="final" />
      </section>
    </div>
  );
}

function RankingList({ items, totalVotes, variant }: { items: RankingItem[]; totalVotes: number; variant: 'partial' | 'final' }) {
  if (items.length === 0) return <p className="text-white/60">Ainda não há votos.</p>;
  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const percentage = totalVotes ? item.percentage : 0;
        const rank = rankFor(items, index);
        const tied = item.votes > 0 && items.some((other, otherIndex) => otherIndex !== index && other.votes === item.votes);
        return (
          <article key={item.participantId} className="rounded-lg border border-white/10 bg-black/25 p-4">
            <div className="grid gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
              <div className="flex items-center gap-3 sm:block">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-ember/30 bg-ember/12 text-lg font-black text-ember sm:mx-auto">
                  {positionText(rank)}
                </div>
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-white/10 sm:mt-3 sm:h-14 sm:w-14">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.costumeName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Sparkles className="h-6 w-6 text-ember" />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black leading-tight text-white">{variant === 'final' && rank <= 3 ? `${rank}º lugar - ` : ''}{item.costumeName}</h3>
                  {tied && <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-black uppercase text-amber-100">Empate</span>}
                </div>
                <p className="mt-1 text-sm text-white/60">{item.participantName}</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-ember shadow-glow transition-all duration-500" style={{ width: `${Math.min(100, percentage)}%` }} />
                </div>
              </div>

              <div className="flex items-end justify-between gap-4 sm:block sm:text-right">
                <p className="text-2xl font-black text-white">{item.votes}</p>
                <p className="text-xs font-bold uppercase text-white/45">voto{item.votes === 1 ? '' : 's'}</p>
                <p className="text-xl font-black text-ember sm:mt-2">{formatPercent(percentage)}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function rankFor(items: RankingItem[], index: number) {
  if (!items[index].votes) return index + 1;
  let rank = 1;
  for (let i = 1; i <= index; i += 1) {
    if (items[i].votes < items[i - 1].votes) rank = i + 1;
  }
  return rank;
}

function positionText(rank: number) {
  return `${rank}º`;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(safeValue % 1 === 0 ? 0 : 1)}%`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
