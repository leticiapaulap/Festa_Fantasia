import { Link } from 'react-router-dom';
import { CalendarClock, QrCode, Trophy, Users, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function HomePage() {
  const origin = window.location.origin;
  return (
    <section className="grid gap-6 py-4 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-10">
      <div className="py-8">
        <p className="mb-3 inline-flex rounded-full border border-ember/35 bg-ember/10 px-3 py-1 text-sm font-bold uppercase text-ember">
          Concurso da noite
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight text-white sm:text-5xl lg:text-6xl">Festa à Fantasia</h1>
        <p className="mt-4 max-w-2xl text-xl leading-8 text-white/75">Qual será a melhor fantasia da noite?</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link className="btn-primary" to="/cadastro">Cadastrar minha fantasia</Link>
          <Link className="btn-secondary" to="/votar"><Vote className="h-4 w-4" /> Votar na melhor fantasia</Link>
          <Link className="btn-secondary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
          <Link className="btn-secondary" to="/resultado"><Trophy className="h-4 w-4" /> Ver resultado</Link>
        </div>
        <div className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
          {['Cadastro pelo celular', 'Voto com código único', 'Ranking em tempo real'].map((item) => (
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
          <h2 className="text-xl font-bold">QR Codes da festa</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          <Qr title="Cadastro" value={`${origin}/cadastro`} />
          <Qr title="Votação" value={`${origin}/votar`} />
        </div>
      </aside>
    </section>
  );
}

function Qr({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <p className="mb-3 font-bold text-white">{title}</p>
      <div className="inline-block rounded-lg bg-white p-3">
        <QRCodeSVG value={value} size={150} />
      </div>
      <p className="mt-3 break-all text-xs text-white/50">{value}</p>
    </div>
  );
}
