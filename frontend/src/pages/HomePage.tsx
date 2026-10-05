import { Link } from 'react-router-dom';
import { CalendarClock, Copy, ExternalLink, LockKeyhole, QrCode, Trophy, Users, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import { eventPhase, formatEventDate } from '../services/eventPhase';
import { publicVotingUrl } from '../services/publicUrl';
import { useEventSettings } from '../services/useEventSettings';

export function HomePage() {
  const { settings, loading: settingsLoading, error: settingsError } = useEventSettings();
  const [tick, setTick] = useState(Date.now());

  const phase = settings ? eventPhase(settings) : null;
  const eventDate = formatEventDate(settings);
  const voteUrl = publicVotingUrl();
  const votingAvailable = settings?.votingState === 'OPEN' || settings?.votingState === 'TEST';
  const votingBlockedBySchedule = !!settings?.votingStartsAt && !votingAvailable && phase !== 'FINISHED';
  const steps = useMemo(() => !phase ? [] : phase === 'VOTING'
    ? ['Escolha sua fantasia favorita', 'Confirme seu voto', 'Aguarde o resultado final']
    : ['Cadastre sua fantasia', 'Envie sua foto', 'Aguarde o dia da votação'], [phase]);

  const copyVoting = () => navigator.clipboard?.writeText(voteUrl);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="grid gap-6 py-4 md:grid-cols-[1.02fr_minmax(20rem,0.98fr)] md:items-center md:py-10">
      <div className="py-6">
        <p className="mb-3 inline-flex rounded-full border border-ember/35 bg-ember/10 px-3 py-1 text-sm font-bold uppercase text-ember">
          Concurso da noite
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight text-white sm:text-5xl lg:text-6xl">Halloween</h1>
        {eventDate && <p className="mt-3 text-sm font-semibold uppercase text-white/55">{eventDate}</p>}
        {settingsError && (
          <p className="mt-3 max-w-2xl rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
            Não foi possível carregar as informações do evento.
          </p>
        )}
        {settingsLoading && (
          <p className="mt-3 max-w-2xl rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70">
            Carregando informações do evento...
          </p>
        )}

        {phase === 'REGISTRATION' && (
          <>
            <p className="mt-4 inline-flex rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-bold uppercase text-emerald-100">Cadastros abertos</p>
            <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Cadastre sua fantasia para participar do Halloween.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link className="btn-primary" to="/cadastro">Cadastrar minha fantasia</Link>
              <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
            </div>
          </>
        )}

        {phase === 'PREPARATION' && (
          <>
            <p className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold uppercase text-white/75">Cadastros encerrados</p>
            <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Estamos preparando a votação. Ela será liberada durante o evento.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
            </div>
          </>
        )}

        {phase === 'VOTING' && (
          <>
            <p className="mt-4 inline-flex rounded-lg border border-ember/35 bg-ember/10 px-3 py-2 text-sm font-bold uppercase text-ember">Votação aberta</p>
            <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Vote na sua fantasia favorita.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link className="btn-primary text-base sm:text-sm" to="/votar"><Vote className="h-4 w-4" /> Votar agora</Link>
              <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
            </div>
          </>
        )}

        {phase === 'FINISHED' && (
          <>
            <p className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold uppercase text-white/75">Votação encerrada</p>
            <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Obrigado pela participação.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {settings?.showPublicResults && <Link className="btn-primary" to="/resultado"><Trophy className="h-4 w-4" /> Ver resultado</Link>}
              <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
            </div>
          </>
        )}

        {steps.length > 0 && (
          <div className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/70">
                <CalendarClock className="h-5 w-5 shrink-0 text-ember" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="halloween-card rounded-xl p-4">
        {!phase && (
          <StatusPanel title="VOTAÇÃO" text={settingsLoading ? 'Carregando informações do evento...' : 'Não foi possível carregar as informações do evento.'} />
        )}
        {phase && phase !== 'FINISHED' && votingAvailable && (
          <QrPanel
            value={voteUrl}
            onCopy={copyVoting}
            testMode={settings?.votingState === 'TEST'}
          />
        )}
        {phase && phase !== 'FINISHED' && !votingAvailable && (
          <LockedVotingPanel startsAt={settings?.votingStartsAt} tick={tick} showCountdown={votingBlockedBySchedule} />
        )}
        {phase === 'FINISHED' && (
          <StatusPanel title="VOTAÇÃO" text="A votação foi encerrada. Obrigado por participar." />
        )}
      </aside>

      <footer className="md:col-span-2">
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/65 underline-offset-4 transition hover:bg-white/10 hover:text-white">
          <LockKeyhole className="h-4 w-4" />
          Área administrativa
        </Link>
      </footer>
    </section>
  );
}

function QrPanel({
  value,
  onCopy,
  testMode,
}: {
  value: string;
  onCopy: () => void;
  testMode?: boolean;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[26rem] gap-5">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-ember/25 bg-ember/10 text-ember">
          <QrCode className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-normal text-white">VOTAÇÃO</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Escaneie o QR Code ou acesse pelo link abaixo para participar quando a votação estiver liberada.
        </p>
        {testMode && (
          <p className="mt-3 inline-flex rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-black uppercase text-amber-100">
            Modo de teste ativo
          </p>
        )}
      </div>

      <div className="mx-auto grid aspect-square w-[min(240px,72vw)] place-items-center rounded-xl border border-white/10 bg-white p-4 shadow-glow sm:w-[280px]">
        <QRCodeSVG value={value} className="h-full w-full" bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      </div>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
        <label className="text-xs font-black uppercase text-white/45" htmlFor="voting-url">Link da votação</label>
        <input
          id="voting-url"
          className="input min-h-11 bg-black/35 px-3 py-2 text-sm"
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn-secondary min-h-11 px-3 py-2" type="button" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            COPIAR LINK
          </button>
          <Link className="btn-primary min-h-11 px-3 py-2" to="/votar">
            <ExternalLink className="h-4 w-4" />
            ABRIR VOTAÇÃO
          </Link>
        </div>
      </div>
    </div>
  );
}

function LockedVotingPanel({ startsAt, tick, showCountdown }: { startsAt?: string | null; tick: number; showCountdown: boolean }) {
  return (
    <div className="mx-auto grid w-full max-w-[26rem] gap-5 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-ember/25 bg-ember/10 text-ember">
        <QrCode className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-normal text-white">VOTAÇÃO</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Votação será liberada em breve.
        </p>
      </div>
      {showCountdown && startsAt && <VoteCountdown target={startsAt} tick={tick} />}
      <p className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white/62">
        Quando chegar o horário configurado pela organização, o acesso à votação ficará disponível aqui.
      </p>
    </div>
  );
}

function VoteCountdown({ target, tick }: { target: string; tick: number }) {
  const remaining = Math.max(0, new Date(target).getTime() - tick);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <div>
      <p className="mb-3 text-xs font-black uppercase text-ember">Liberação da votação em</p>
      <div className="grid grid-cols-4 gap-2">
        <CountdownBox value={days} label="Dias" />
        <CountdownBox value={hours} label="Horas" />
        <CountdownBox value={minutes} label="Min" />
        <CountdownBox value={seconds} label="Seg" />
      </div>
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-2">
      <p className="text-2xl font-black text-white tabular-nums">{String(value).padStart(2, '0')}</p>
      <p className="text-[10px] font-bold uppercase text-white/45">{label}</p>
    </div>
  );
}

function StatusPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <QrCode className="h-6 w-6 text-ember" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="text-white/70">{text}</p>
    </div>
  );
}
