import { Copy, Download, Edit3, ExternalLink, Monitor, Trash2 } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { ParticipantCard } from '../components/ParticipantCard';
import { api, apiMessage } from '../services/api';
import { formatEventDate, registrationStatusLabel, votingStatusLabel } from '../services/eventPhase';
import { publicRegistrationUrl, publicVotingUrl } from '../services/publicUrl';
import type { Dashboard, EventSettings, Participant, Results, VoteCode } from '../types/api';

type Tab = 'summary' | 'participants' | 'qr' | 'results' | 'codes' | 'settings';

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codes, setCodes] = useState<VoteCode[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [editing, setEditing] = useState<Participant | null>(null);

  async function load() {
    const [dash, res, people, voteCodes, eventSettings] = await Promise.all([
      api.get<Dashboard>('/admin/dashboard'),
      api.get<Results>('/results'),
      api.get<Participant[]>('/admin/participants'),
      api.get<VoteCode[]>('/admin/vote-codes'),
      api.get<EventSettings>('/settings'),
    ]);
    setDashboard(dash.data);
    setResults(res.data);
    setParticipants(people.data);
    setCodes(voteCodes.data);
    setSettings(eventSettings.data);
  }

  useEffect(() => {
    load().catch((error) => toast.error(apiMessage(error)));
    const id = window.setInterval(() => load().catch(() => undefined), 7000);
    return () => window.clearInterval(id);
  }, []);

  async function toggleVoting(open: boolean) {
    if (open && settings?.registrationOpen && !window.confirm('Os cadastros ainda estão abertos.\n\nDeseja encerrá-los e iniciar a votação?')) return;
    if (!open && !window.confirm('Tem certeza que deseja encerrar a votação?')) return;
    try {
      await api.post(open ? '/admin/voting/open' : '/admin/voting/close');
      toast.success(open ? 'Votação aberta.' : 'Votação encerrada.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function generateCodes(quantity: number) {
    try {
      await api.post('/admin/vote-codes/generate', { quantity });
      toast.success(`${quantity} código(s) gerado(s).`);
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function removeParticipant(id: number) {
    if (!window.confirm('Excluir este participante?')) return;
    try {
      await api.delete(`/admin/participants/${id}`);
      toast.success('Participante excluído.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function saveParticipant(values: Participant) {
    try {
      await api.put(`/admin/participants/${values.id}`, values);
      setEditing(null);
      toast.success('Participante atualizado.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function saveSettings(next: EventSettings) {
    try {
      await api.put('/admin/settings', next);
      toast.success('Configurações salvas.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  function downloadQr(id: string, filename: string) {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Participantes" value={dashboard?.participants ?? 0} />
        <Metric label="Votos" value={dashboard?.votes ?? 0} />
        <Metric label="Códigos disponíveis" value={dashboard?.availableCodes ?? 0} />
        <Metric label="Códigos utilizados" value={dashboard?.usedCodes ?? 0} />
        <Metric label="Status" value={dashboard?.status ?? '...'} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => toggleVoting(true)}>Abrir votação</button>
        <button className="btn-secondary" onClick={() => toggleVoting(false)}>Encerrar votação</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['summary', 'participants', 'qr', 'results', 'codes', 'settings'] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? 'btn-primary whitespace-nowrap' : 'btn-secondary whitespace-nowrap'} onClick={() => setTab(item)}>
            {labelFor(item)}
          </button>
        ))}
      </div>
      {tab === 'summary' && settings && <SummaryAdmin settings={settings} participants={participants} totalVotes={dashboard?.votes ?? 0} onGoParticipants={() => setTab('participants')} />}
      {tab === 'participants' && <ParticipantsAdmin participants={participants} onEdit={setEditing} onDelete={removeParticipant} />}
      {tab === 'codes' && <CodesAdmin codes={codes} onGenerate={generateCodes} />}
      {tab === 'qr' && settings && (
        <QrAdmin
          settings={settings}
          participants={participants}
          totalVotes={dashboard?.votes ?? 0}
          onDownload={() => downloadQr('admin-voting-qr-download', 'qr-votacao-halloween.png')}
          onDownloadRegistration={() => downloadQr('admin-registration-qr-download', 'qr-cadastro-halloween.png')}
        />
      )}
      {tab === 'results' && <Ranking results={results} />}
      {tab === 'settings' && settings && <SettingsAdmin settings={settings} onSave={saveSettings} />}
      <QRCodeCanvas id="admin-registration-qr-download" className="hidden" value={publicRegistrationUrl()} size={1200} bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      <QRCodeCanvas id="admin-voting-qr-download" className="hidden" value={publicVotingUrl()} size={1200} bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      <EditParticipantModal participant={editing} onClose={() => setEditing(null)} onSave={saveParticipant} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="card"><p className="text-xs uppercase text-white/50">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>;
}

function labelFor(tab: Tab) {
  return ({ summary: 'Resumo', participants: 'Participantes', qr: 'QR Codes', results: 'Resultados', codes: 'Códigos', settings: 'Configurações' })[tab];
}

function SummaryAdmin({ settings, participants, totalVotes, onGoParticipants }: { settings: EventSettings; participants: Participant[]; totalVotes: number; onGoParticipants: () => void }) {
  const active = participants.filter((participant) => participant.active);
  const withPhoto = active.filter((participant) => !!participant.photoUrl);
  const missingPhotos = active.length - withPhoto.length;
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="card grid gap-3">
        <h2 className="text-xl font-bold text-white">Status do evento</h2>
        <Readiness label="Cadastros" value={registrationStatusLabel(settings)} ok={settings.registrationOpen} />
        <Readiness label="Votação" value={votingStatusLabel(settings)} ok={settings.canAcceptVotes} />
        <Readiness label="Total de votos" value={totalVotes} ok={totalVotes > 0} />
      </div>
      <div className="card grid gap-3">
        <h2 className="text-xl font-bold text-white">Preparação para a festa</h2>
        <Readiness label="Participantes cadastrados" value={participants.length} ok={participants.length > 0} />
        <Readiness label="Com foto" value={withPhoto.length} ok={withPhoto.length === active.length && active.length > 0} />
        <Readiness label="Sem foto" value={missingPhotos} ok={missingPhotos === 0} />
        <Readiness label="Cadastros" value={registrationStatusLabel(settings)} ok={settings.registrationOpen} />
        <Readiness label="Data da festa" value={formatEventDate(settings) || 'Não definida'} ok={!!settings.eventDate} />
        <Readiness label="QR Cadastro" value="Pronto" ok />
        <Readiness label="QR Votação" value="Pronto" ok />
        <Readiness label="Votação" value={votingStatusLabel(settings)} ok={settings.canAcceptVotes} />
        {missingPhotos > 0 && (
          <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3">
            <p className="text-sm font-semibold text-amber-100">{missingPhotos} participante(s) ativo(s) sem foto.</p>
            <button className="btn-secondary mt-3 min-h-10 px-3 py-2" onClick={onGoParticipants}>Ver participantes</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Ranking({ results }: { results: Results | null }) {
  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-bold text-white">Ranking em tempo real</h2>
      <div className="grid gap-3">
        {results?.ranking.map((item, index) => <ParticipantCard key={item.participantId} ranking={item} action={<span className="text-sm text-white/60">{index + 1}º lugar</span>} />)}
        {results?.ranking.length === 0 && <p className="text-white/60">Ainda não há votos.</p>}
      </div>
    </div>
  );
}

function ParticipantsAdmin({ participants, onEdit, onDelete }: { participants: Participant[]; onEdit: (p: Participant) => void; onDelete: (id: number) => void }) {
  return (
    <div className="grid gap-3">
      {participants.map((participant) => (
        <div key={participant.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold text-white">{participant.name}</p><p className="text-ember">{participant.costumeName}</p></div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => onEdit(participant)}><Edit3 className="h-4 w-4" /> Editar</button>
            <button className="btn-secondary" onClick={() => onDelete(participant.id)}><Trash2 className="h-4 w-4" /> Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodesAdmin({ codes, onGenerate }: { codes: VoteCode[]; onGenerate: (quantity: number) => void }) {
  const origin = window.location.origin;
  return (
    <div className="card grid gap-4">
      <div className="flex flex-wrap gap-2">
        {[1, 10, 50].map((qty) => <button key={qty} className="btn-primary" onClick={() => onGenerate(qty)}>Gerar {qty}</button>)}
        <button className="btn-secondary" onClick={() => onGenerate(Number(window.prompt('Quantidade personalizada', '20') || 0))}>Quantidade personalizada</button>
      </div>
      <div className="grid gap-3">
        {codes.map((code) => (
          <div key={code.id} className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div><p className="font-mono font-bold text-white">{code.code}</p><p className="text-sm text-white/50">{code.used ? 'Utilizado' : 'Disponível'}</p></div>
            <div className="w-fit rounded-lg bg-white p-2"><QRCodeSVG value={`${origin}/votar?codigo=${code.code}`} size={76} /></div>
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(code.code)}><Copy className="h-4 w-4" /> Copiar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrAdmin({
  settings,
  participants,
  totalVotes,
  onDownload,
  onDownloadRegistration,
}: {
  settings: EventSettings;
  participants: Participant[];
  totalVotes: number;
  onDownload: () => void;
  onDownloadRegistration: () => void;
}) {
  const registrationUrl = publicRegistrationUrl();
  const voteUrl = publicVotingUrl();
  const active = participants.filter((participant) => participant.active);
  const activeWithPhoto = active.filter((participant) => !!participant.photoUrl);
  const missingPhotos = active.length - activeWithPhoto.length;
  const configured = !!settings.eventDate && !!settings.eventTime && !!settings.timezone;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card grid gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-ember">QR Code de Cadastro — Halloween</p>
          <h2 className="mt-1 text-2xl font-black text-white">Cadastro</h2>
          <p className="mt-2 text-white/65">Disponível para preparação, impressão e compartilhamento administrativo.</p>
          <p className="mt-2 text-sm font-bold text-white/70">Status: {settings.registrationOpen ? 'Cadastros abertos' : 'Cadastros encerrados'}</p>
        </div>
        <div className="grid place-items-center rounded-lg border border-white/10 bg-white p-5">
          <QRCodeSVG value={registrationUrl} size={300} bgColor="#ffffff" fgColor="#111111" />
        </div>
        <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">{registrationUrl}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={onDownloadRegistration}><Download className="h-4 w-4" /> Baixar QR</button>
          <button className="btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(registrationUrl)}><Copy className="h-4 w-4" /> Copiar link</button>
          <a className="btn-secondary" href="/cadastro" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir página</a>
        </div>
      </div>
      <div className="card grid gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-ember">QR Code de Votação — Halloween</p>
          <h2 className="mt-1 text-2xl font-black text-white">Votação</h2>
          <p className="mt-2 text-white/65">Pré-visualização administrativa. O QR ainda não está público antes da janela e do status OPEN.</p>
        </div>
        <div className="grid place-items-center rounded-lg border border-white/10 bg-white p-5">
          <QRCodeSVG value={voteUrl} size={300} bgColor="#ffffff" fgColor="#111111" />
        </div>
        <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">{voteUrl}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={onDownload}><Download className="h-4 w-4" /> Baixar QR</button>
          <button className="btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(voteUrl)}><Copy className="h-4 w-4" /> Copiar link</button>
          <a className="btn-secondary" href="/admin/qr" target="_blank" rel="noreferrer"><Monitor className="h-4 w-4" /> Abrir tela cheia</a>
          <a className="btn-secondary" href="/votar" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Testar votação</a>
        </div>
      </div>
      <div className="card grid content-start gap-3">
        <h3 className="text-xl font-bold text-white">Pronto para a votação</h3>
        <Readiness label="Participantes cadastrados" value={participants.length} ok={participants.length > 0} />
        <Readiness label="Participantes ativos" value={active.length} ok={active.length > 0} />
        <Readiness label="Ativos com foto" value={activeWithPhoto.length} ok={missingPhotos === 0 && active.length > 0} />
        <Readiness label="Configuração de data definida" value={configured ? 'Sim' : 'Não'} ok={configured} />
        <Readiness label="QR Code configurado" value="Sim" ok />
        {missingPhotos > 0 && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">{missingPhotos} participante(s) ativo(s) sem foto.</p>}
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">
          <p className="font-bold text-white">Halloween</p>
          <p>Status: {settings.canAcceptVotes ? 'Votação aberta' : settings.votingAvailability}</p>
          <p>Total de votos: {totalVotes}</p>
          <p>Participantes: {participants.length}</p>
        </div>
      </div>
    </div>
  );
}

function Readiness({ label, value, ok }: { label: string; value: string | number; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <span className="text-sm text-white/70">{label}</span>
      <span className={ok ? 'font-bold text-emerald-200' : 'font-bold text-amber-100'}>{value}</span>
    </div>
  );
}

function SettingsAdmin({ settings, onSave }: { settings: EventSettings; onSave: (settings: EventSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <form className="card grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <input className="input" value={draft.eventName} onChange={(e) => setDraft({ ...draft, eventName: e.target.value })} />
      <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <textarea className="input min-h-24" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" type="date" value={draft.eventDate ?? ''} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} />
        <input className="input" type="time" value={draft.eventTime ?? ''} onChange={(e) => setDraft({ ...draft, eventTime: e.target.value })} />
        <input className="input" type="time" value={draft.votingEndTime ?? ''} onChange={(e) => setDraft({ ...draft, votingEndTime: e.target.value })} aria-label="Encerramento da votação" />
        <input className="input" value={draft.timezone ?? 'America/Sao_Paulo'} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} placeholder="America/Sao_Paulo" aria-label="Timezone" />
      </div>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.registrationOpen} onChange={(e) => setDraft({ ...draft, registrationOpen: e.target.checked })} /> Cadastro aberto</label>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.resultsPublic} onChange={(e) => setDraft({ ...draft, resultsPublic: e.target.checked, showPublicResults: e.target.checked })} /> Resultado público</label>
      <button className="btn-primary w-full">Salvar configurações</button>
    </form>
  );
}

function EditParticipantModal({ participant, onClose, onSave }: { participant: Participant | null; onClose: () => void; onSave: (p: Participant) => void }) {
  const [draft, setDraft] = useState<Participant | null>(participant);
  useEffect(() => setDraft(participant), [participant]);
  if (!draft) return null;
  return (
    <Modal open={!!participant} title="Editar participante" onClose={onClose}>
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className="input" value={draft.costumeName} onChange={(e) => setDraft({ ...draft, costumeName: e.target.value })} />
        <input className="input" value={draft.photoUrl ?? ''} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} />
        <textarea className="input min-h-24" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <button className="btn-primary">Salvar</button>
      </form>
    </Modal>
  );
}
