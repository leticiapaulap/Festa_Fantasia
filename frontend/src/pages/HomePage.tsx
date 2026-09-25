import { Link } from 'react-router-dom';
import { CalendarClock, QrCode, Trophy, Users, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { publicVotingUrl } from '../services/publicUrl';
import type { EventSettings } from '../types/api';

export function HomePage() {
  const [settings, setSettings] = useState<EventSettings | null>(null);

  useEffect(() => {
    api.get<EventSettings>('/settings').then(({ data }) => setSettings(data)).catch(() => undefined);
  }, []);

  const voteUrl = publicVotingUrl();
  const canVote = settings?.canAcceptVotes === true;
  const closed = settings?.votingAvailability === 'CLOSED' || settings?.votingAvailability === 'AFTER_WINDOW';
  const status = canVote
    ? 'Votação aberta'
    : closed
      ? 'Votação encerrada'
      : 'Votação ainda não disponível';

  return (
    <section className="grid gap-6 py-4 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-10">
      <div className="py-8">
        <p className="mb-3 inline-flex rounded-full border border-ember/35 bg-ember/10 px-3 py-1 text-sm font-bold uppercase text-ember">
          Concurso da noite
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight text-white sm:text-5xl lg:text-6xl">Festa Fantasia</h1>
        <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Vote na sua fantasia favorita.</p>
        <p className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75">{status}</p>
        {!canVote && !closed && <p className="mt-3 max-w-xl text-white/65">A votação será liberada durante o evento.</p>}
        {closed && <p className="mt-3 max-w-xl text-white/65">Obrigado por participar.</p>}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {canVote && <Link className="btn-primary text-base sm:text-sm" to="/votar"><Vote className="h-4 w-4" /> Votar agora</Link>}
          <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
          {settings?.registrationOpen && !canVote && <Link className="btn-secondary" to="/cadastro">Cadastrar minha fantasia</Link>}
          {settings?.showPublicResults && <Link className="btn-secondary" to="/resultado"><Trophy className="h-4 w-4" /> Ver resultado</Link>}
        </div>
        <div className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
          {['Escolha uma fantasia', 'Confirme seu voto', 'Aguarde o resultado final'].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-white/70">
              <CalendarClock className="h-5 w-5 shrink-0 text-ember" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <aside className="card">
        <div className="flex items-center gap-3">
          <QrCode className="h-6 w-6 text-ember" />
          <h2 className="text-xl font-bold">{canVote ? 'VOTAÇÃO ABERTA' : 'Festa Fantasia'}</h2>
        </div>
        {canVote ? (
          <div className="mt-5 grid gap-4">
            <p className="text-white/70">Escaneie para votar na sua fantasia favorita.</p>
            <Qr title="Votação" value={voteUrl} />
            <Link className="btn-primary md:hidden" to="/votar">Votar agora</Link>
          </div>
        ) : (
          <p className="mt-5 text-white/70">{closed ? 'A votação foi encerrada.' : 'O QR Code público será exibido quando a votação estiver aberta.'}</p>
        )}
      </aside>
      <footer className="md:col-span-2">
        <Link to="/admin" className="text-sm font-semibold text-white/55 underline-offset-4 hover:text-white hover:underline">
          Área administrativa
        </Link>
      </footer>
    </section>
  );
}

function Qr({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <p className="mb-3 font-bold text-white">{title}</p>
      <div className="inline-block rounded-lg bg-white p-3">
        <QRCodeSVG value={value} size={220} bgColor="#ffffff" fgColor="#111111" />
      </div>
      <p className="mt-3 break-all text-xs text-white/50">{value}</p>
    </div>
  );
}
