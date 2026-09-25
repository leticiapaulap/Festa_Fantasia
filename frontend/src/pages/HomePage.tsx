import { Link } from 'react-router-dom';
import { CalendarClock, LockKeyhole, QrCode, Share2, Trophy, Users, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { eventPhase, formatEventDate } from '../services/eventPhase';
import { publicRegistrationUrl, publicVotingUrl } from '../services/publicUrl';
import type { EventSettings } from '../types/api';

export function HomePage() {
  const [settings, setSettings] = useState<EventSettings | null>(null);

  useEffect(() => {
    api.get<EventSettings>('/settings').then(({ data }) => setSettings(data)).catch(() => undefined);
  }, []);

  const phase = eventPhase(settings);
  const eventDate = formatEventDate(settings);
  const registrationUrl = publicRegistrationUrl();
  const voteUrl = publicVotingUrl();
  const steps = useMemo(() => phase === 'VOTING'
    ? ['Escolha sua fantasia favorita', 'Confirme seu voto', 'Aguarde o resultado final']
    : ['Cadastre sua fantasia', 'Envie sua foto', 'Aguarde o dia da votação'], [phase]);

  const copyRegistration = () => navigator.clipboard?.writeText(registrationUrl);

  return (
    <section className="grid gap-6 py-4 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-10">
      <div className="py-6">
        <p className="mb-3 inline-flex rounded-full border border-ember/35 bg-ember/10 px-3 py-1 text-sm font-bold uppercase text-ember">
          Concurso da noite
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight text-white sm:text-5xl lg:text-6xl">Halloween</h1>
        {eventDate && <p className="mt-3 text-sm font-semibold uppercase text-white/55">{eventDate}</p>}

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

        <div className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
          {steps.map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-white/70">
              <CalendarClock className="h-5 w-5 shrink-0 text-ember" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="card">
        {phase === 'REGISTRATION' && (
          <QrPanel
            title="CADASTROS ABERTOS"
            description="Escaneie para cadastrar sua fantasia pelo celular."
            value={registrationUrl}
            footerTitle="Votação"
            footerText="Será liberada durante a festa."
            action={<Link className="btn-primary md:hidden" to="/cadastro">Cadastrar minha fantasia</Link>}
            extra={<button className="btn-secondary md:hidden" type="button" onClick={copyRegistration}><Share2 className="h-4 w-4" /> Copiar link</button>}
          />
        )}
        {phase === 'VOTING' && (
          <QrPanel
            title="VOTAÇÃO ABERTA"
            description="Escaneie para votar na sua fantasia favorita."
            value={voteUrl}
            action={<Link className="btn-primary md:hidden" to="/votar">Votar agora</Link>}
          />
        )}
        {phase === 'PREPARATION' && (
          <StatusPanel title="Votação aguardando" text="Cadastros encerrados. A votação será liberada durante o evento." />
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
}: {
  title: string;
  description: string;
  value: string;
  action?: ReactNode;
  extra?: ReactNode;
  footerTitle?: string;
  footerText?: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <QrCode className="h-6 w-6 text-ember" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="text-white/70">{description}</p>
      <div className="mx-auto w-fit rounded-lg bg-white p-3">
        <QRCodeSVG value={value} size={220} bgColor="#ffffff" fgColor="#111111" />
      </div>
      <p className="break-all text-xs text-white/50">{value}</p>
      {action}
      {extra}
      {footerTitle && footerText && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">
          <p className="font-bold text-white">{footerTitle}</p>
          <p>{footerText}</p>
        </div>
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
