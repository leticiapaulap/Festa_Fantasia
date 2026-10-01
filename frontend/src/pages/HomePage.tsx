import { Link } from 'react-router-dom';
import { CalendarClock, LockKeyhole, QrCode, Share2, Trophy, Users, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo, type ReactNode } from 'react';
import { eventPhase, formatEventDate } from '../services/eventPhase';
import { publicVotingUrl } from '../services/publicUrl';
import { useEventSettings } from '../services/useEventSettings';

export function HomePage() {
  const { settings, loading: settingsLoading, error: settingsError } = useEventSettings();

  const phase = settings ? eventPhase(settings) : null;
  const eventDate = formatEventDate(settings);
  const voteUrl = publicVotingUrl();
  const steps = useMemo(() => !phase ? [] : phase === 'VOTING'
    ? ['Escolha sua fantasia favorita', 'Confirme seu voto', 'Aguarde o resultado final']
    : ['Cadastre sua fantasia', 'Envie sua foto', 'Aguarde o dia da votação'], [phase]);

  const copyVoting = () => navigator.clipboard?.writeText(voteUrl);

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

      <aside className="card">
        {!phase && (
          <StatusPanel title="Halloween" text={settingsLoading ? 'Carregando informações do evento...' : 'Não foi possível carregar as informações do evento.'} />
        )}
        {phase === 'REGISTRATION' && (
          <QrPanel
            title="VOTAÇÃO"
            description="Escaneie para acompanhar a contagem regressiva e acessar a votação quando ela for liberada."
            value={voteUrl}
            variant="vote"
            footerTitle="Cadastro"
            footerText="O QR de cadastro continua separado em /cadastro."
            action={<Link className="btn-primary md:hidden" to="/votar">Abrir votação</Link>}
            extra={<button className="btn-secondary md:hidden" type="button" onClick={copyVoting}><Share2 className="h-4 w-4" /> Copiar link</button>}
          />
        )}
        {phase === 'VOTING' && (
          <QrPanel
            title="VOTAÇÃO ABERTA"
            description="Escaneie para votar na sua fantasia favorita."
            value={voteUrl}
            variant="vote"
            action={<Link className="btn-primary md:hidden" to="/votar">Votar agora</Link>}
          />
        )}
        {phase === 'PREPARATION' && (
          <QrPanel
            title="VOTAÇÃO"
            description="Escaneie para acompanhar a contagem regressiva e acessar a votação quando ela for liberada."
            value={voteUrl}
            variant="vote"
            action={<Link className="btn-primary md:hidden" to="/votar">Abrir votação</Link>}
          />
        )}
        {phase === 'FINISHED' && (
          <StatusPanel title="Halloween" text="A votação foi encerrada. Obrigado por participar." />
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
  title,
  description,
  value,
  action,
  extra,
  footerTitle,
  footerText,
  note,
  variant = 'registration',
}: {
  title: string;
  description: string;
  value: string;
  action?: ReactNode;
  extra?: ReactNode;
  footerTitle?: string;
  footerText?: string;
  note?: string;
  variant?: 'registration' | 'vote';
}) {
  return (
    <div className="mx-auto grid w-full max-w-[24rem] gap-4">
      <div className="flex items-center gap-3">
        <QrCode className="h-6 w-6 text-ember" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="text-white/70">{description}</p>
      <div className="mx-auto grid aspect-square w-[min(220px,75vw)] place-items-center rounded-lg bg-white p-4 shadow-glow md:w-[260px]">
        <QRCodeSVG value={value} className="h-full w-full" bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      </div>
      {note && <p className="text-sm font-semibold text-amber-100">{note}</p>}
      <p className="break-all text-xs text-white/50">{value}</p>
      {action}
      {extra}
      {footerTitle && footerText && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">
          <p className="font-bold text-white">{footerTitle}</p>
          <p>{footerText}</p>
        </div>
      )}
      {variant === 'vote' && (
        <p className="text-sm text-white/55">QR de votação separado do cadastro.</p>
      )}
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
