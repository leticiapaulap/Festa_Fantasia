import { Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { publicVotingUrl } from '../services/publicUrl';
import type { EventSettings } from '../types/api';

export function AdminQrPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<EventSettings | null>(null);

  useEffect(() => {
    api.get<EventSettings>('/settings').then(({ data }) => setSettings(data)).catch(() => undefined);
  }, []);

  if (!token) return <Navigate to="/admin" replace />;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-8 text-center">
      <div className="grid w-full max-w-5xl place-items-center gap-8">
        <div>
          <p className="text-xl font-bold uppercase text-ember">Festa Fantasia</p>
          <h1 className="mt-3 text-5xl font-black uppercase leading-tight text-white sm:text-7xl">Escaneie e vote</h1>
          <p className="mt-4 text-2xl text-white/70">{settings?.canAcceptVotes ? 'Votação aberta' : 'Pré-visualização administrativa'}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-glow">
          <QRCodeSVG value={publicVotingUrl()} size={Math.min(450, Math.max(320, window.innerWidth * 0.28))} bgColor="#ffffff" fgColor="#111111" />
        </div>
        <div className="grid gap-2">
          <p className="text-3xl font-black uppercase text-white">Aponte a câmera do celular</p>
          <p className="break-all text-lg text-white/60">{publicVotingUrl()}</p>
        </div>
      </div>
    </main>
  );
}
