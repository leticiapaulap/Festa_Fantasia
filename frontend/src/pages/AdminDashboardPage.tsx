import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FlaskConical,
  LayoutDashboard,
  Monitor,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Vote,
  XCircle,
} from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { type LucideIcon } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminHeader } from '../components/AdminHeader';
import { Modal } from '../components/Modal';
import { PhotoUpload } from '../components/PhotoUpload';
import { RankingBoard } from '../components/RankingBoard';
import { api, apiMessage } from '../services/api';
import { formatEventDate, registrationStatusLabel, votingStatusLabel } from '../services/eventPhase';
import { publicRegistrationUrl, publicVotingUrl } from '../services/publicUrl';
import type { Dashboard, EventSettings, Participant, Results } from '../types/api';

type Tab = 'summary' | 'participants' | 'qr' | 'results' | 'settings';

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [creating, setCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const [dash, res, people, eventSettings] = await Promise.all([
      api.get<Dashboard>('/admin/dashboard'),
      api.get<Results>('/admin/results'),
      api.get<Participant[]>('/admin/participants'),
      api.get<EventSettings>('/settings'),
    ]);
    setDashboard(dash.data);
    setResults(res.data);
    setParticipants(people.data);
    setSettings(eventSettings.data);
    setIsLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setIsLoading(false);
      toast.error(apiMessage(error));
    });
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

  async function createParticipant(values: ParticipantFormValues) {
    try {
      const payload = participantPayload(values);
      await api.post('/admin/participants', payload);
      setCreating(false);
      toast.success('Participante cadastrado.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function saveParticipant(values: ParticipantFormValues) {
    if (!values.id) return;
    try {
      const payload = participantPayload(values);
      await api.put(`/admin/participants/${values.id}`, payload);
      setEditing(null);
      toast.success('Participante atualizado.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function saveSettings(next: EventSettings) {
    return persistSettings(next, 'Configurações salvas com sucesso.');
  }

  async function persistSettings(next: EventSettings, successMessage: string) {
    try {
      await api.put('/admin/settings', next);
      toast.success(successMessage);
      await load();
      return true;
    } catch (error) {
      toast.error(apiMessage(error));
      return false;
    }
  }

  async function clearTestVotes() {
    if (!window.confirm('Deseja apagar apenas os votos de teste?')) return;
    try {
      await api.post('/admin/test-votes/clear', { confirmation: 'Deseja apagar apenas os votos de teste?' });
      toast.success('Votos de teste apagados.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  async function toggleRegistration(open: boolean) {
    if (!settings) return;
    if (!open && !window.confirm('Deseja realmente encerrar os cadastros?')) return;
    await persistSettings({ ...settings, registrationOpen: open }, open ? 'Cadastros abertos.' : 'Cadastros encerrados.');
  }

  async function toggleTestMode(enabled: boolean) {
    if (!settings) return;
    await persistSettings(
      { ...settings, votingTestMode: enabled, showLiveResults: true },
      enabled ? 'Modo de teste ativado.' : 'Modo de teste desativado.',
    );
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
    <section className="admin-dashboard grid min-w-0 gap-6">
      <AdminHeader testMode={settings?.votingTestMode ?? false} />
      {isLoading ? <DashboardSkeleton /> : dashboard && settings ? (
        <>
          <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Metric icon={Users} label="Participantes" value={dashboard.participants} caption="cadastrados" />
            <Metric icon={Vote} label="Votos oficiais" value={dashboard.votes} caption="votos contabilizados" />
            <Metric icon={FlaskConical} label="Votos de teste" value={dashboard.testVotes} caption="fora do resultado oficial" tone="warning" />
            <Metric icon={Vote} label="Total de votos" value={dashboard.totalVotes} caption="oficiais e de teste" />
            <Metric
              icon={Activity}
              label="Status da votação"
              value={votingStatusLabel(settings)}
              caption={settings.votingTestMode ? 'ambiente de teste' : 'status atual do evento'}
              tone={settings.votingTestMode ? 'warning' : settings.votingState === 'OPEN' ? 'success' : 'neutral'}
            />
          </div>
          {settings.votingTestMode && (
            <div className="test-mode-notice flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-amber-100">Modo de teste ativo</h2>
                <p className="mt-1 text-sm text-white/65">Os votos realizados agora não contam para a votação oficial.</p>
              </div>
            </div>
          )}
          <ActionGroups
            settings={settings}
            testVotes={dashboard.testVotes}
            onToggleRegistration={toggleRegistration}
            onToggleTestMode={toggleTestMode}
            onClearTestVotes={clearTestVotes}
            onToggleVoting={toggleVoting}
          />
          <nav className="admin-tabs -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1" aria-label="Navegação administrativa">
            {([
              ['summary', 'Resumo', LayoutDashboard],
              ['participants', 'Participantes', Users],
              ['qr', 'QR Codes', QrCode],
              ['results', 'Resultados', Trophy],
              ['settings', 'Configurações', Settings],
            ] as [Tab, string, LucideIcon][]).map(([item, title, Icon]) => (
              <button
                key={item}
                type="button"
                aria-current={tab === item ? 'page' : undefined}
                className={`admin-tab ${tab === item ? 'admin-tab-active' : ''}`}
                onClick={() => setTab(item)}
              >
                <Icon className="h-4 w-4 shrink-0" /> {title}
              </button>
            ))}
          </nav>
          {tab === 'summary' && <SummaryAdmin
            settings={settings}
            participants={participants}
            totalVotes={dashboard.votes}
            onGoParticipants={() => setTab('participants')}
            onGoSettings={() => setTab('settings')}
          />}
          {tab === 'participants' && <ParticipantsAdmin participants={participants} onCreate={() => setCreating(true)} onEdit={setEditing} onDelete={removeParticipant} />}
          {tab === 'qr' && (
            <QrAdmin
              settings={settings}
              participants={participants}
              totalVotes={dashboard.votes}
              onDownload={() => downloadQr('admin-voting-qr-download', 'qr-votacao-halloween.png')}
              onDownloadRegistration={() => downloadQr('admin-registration-qr-download', 'qr-cadastro-halloween.png')}
            />
          )}
          {tab === 'results' && <Ranking results={results} />}
          {tab === 'settings' && <SettingsAdmin settings={settings} onSave={saveSettings} />}
        </>
      ) : (
        <div className="card grid gap-3">
          <p className="font-semibold text-white">Não foi possível carregar os dados do painel.</p>
          <button className="btn-secondary w-fit" onClick={() => {
            setIsLoading(true);
            load().catch((error) => {
              setIsLoading(false);
              toast.error(apiMessage(error));
            });
          }}>Tentar novamente</button>
        </div>
      )}
      <QRCodeCanvas id="admin-registration-qr-download" className="hidden" value={publicRegistrationUrl()} size={1200} bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      <QRCodeCanvas id="admin-voting-qr-download" className="hidden" value={publicVotingUrl()} size={1200} bgColor="#ffffff" fgColor="#111111" marginSize={4} />
      <ParticipantModal
        open={creating}
        title="Cadastrar participante"
        onClose={() => setCreating(false)}
        onSave={createParticipant}
      />
      <ParticipantModal
        participant={editing}
        open={!!editing}
        title="Editar participante"
        onClose={() => setEditing(null)}
        onSave={saveParticipant}
      />
    </section>
  );
}

type ParticipantFormValues = {
  id?: number;
  name: string;
  costumeName: string;
  description?: string | null;
  active: boolean;
  photoUrl?: string | null;
  photo?: File | null;
  removePhoto?: boolean;
};

function participantPayload(values: ParticipantFormValues) {
  const payload = new FormData();
  payload.append('name', values.name);
  payload.append('costumeName', values.costumeName);
  if (values.description?.trim()) payload.append('description', values.description.trim());
  payload.append('active', String(values.active));
  if (values.removePhoto) payload.append('removePhoto', 'true');
  if (values.photo) payload.append('photo', values.photo);
  return payload;
}

function Metric({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <article className={`metric-card metric-${tone} min-w-0 rounded-xl border p-4 sm:p-5`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-ember" />
        <p className="truncate text-xs font-bold uppercase tracking-wide text-white/60">{label}</p>
      </div>
      <p className="mt-4 truncate text-[28px] font-extrabold leading-none text-white sm:text-[32px]" title={String(value)}>{value}</p>
      <p className="mt-2 truncate text-xs text-white/50">{caption}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid animate-pulse gap-6" role="status" aria-label="Carregando dados do painel">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-32 rounded-xl border border-white/10 bg-white/5" />
        ))}
      </div>
      <div className="h-36 rounded-xl border border-white/10 bg-white/5" />
      <div className="h-12 rounded-xl border border-white/10 bg-white/5" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-white/10 bg-white/5" />
        <div className="h-64 rounded-xl border border-white/10 bg-white/5" />
      </div>
    </div>
  );
}

function ActionGroups({
  settings,
  testVotes,
  onToggleRegistration,
  onToggleTestMode,
  onClearTestVotes,
  onToggleVoting,
}: {
  settings: EventSettings;
  testVotes: number;
  onToggleRegistration: (open: boolean) => void;
  onToggleTestMode: (enabled: boolean) => void;
  onClearTestVotes: () => void;
  onToggleVoting: (open: boolean) => void;
}) {
  const votingOpen = settings.votingState === 'OPEN';
  return (
    <section className="grid gap-3 lg:grid-cols-3" aria-label="Ações administrativas">
      <div className="action-card">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/65">Cadastros</h2>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className={`status-dot ${settings.registrationOpen ? 'bg-emerald-300' : 'bg-white/35'}`} />
            {registrationStatusLabel(settings)}
          </p>
        </div>
        <button
          className={settings.registrationOpen ? 'btn-danger' : 'btn-primary'}
          onClick={() => onToggleRegistration(!settings.registrationOpen)}
        >
          {settings.registrationOpen ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {settings.registrationOpen ? 'Encerrar cadastros' : 'Abrir cadastros'}
        </button>
      </div>
      <div className="action-card">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/65">Votação</h2>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className={`status-dot ${settings.votingTestMode ? 'bg-amber-300' : votingOpen ? 'bg-emerald-300' : 'bg-sky-300'}`} />
            {votingStatusLabel(settings)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.votingTestMode && <a className="btn-secondary" href="/votar" target="_blank" rel="noreferrer"><FlaskConical className="h-4 w-4" /> Testar votação</a>}
          {votingOpen
            ? <button className="btn-danger" onClick={() => onToggleVoting(false)}><XCircle className="h-4 w-4" /> Encerrar votação</button>
            : <button className="btn-primary" onClick={() => onToggleVoting(true)}><Vote className="h-4 w-4" /> Abrir votação</button>}
        </div>
      </div>
      <div className="action-card">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/65">Testes</h2>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className={`status-dot ${settings.votingTestMode ? 'bg-amber-300' : 'bg-white/35'}`} />
            {settings.votingTestMode ? 'Modo ativo' : 'Modo inativo'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={settings.votingTestMode ? 'btn-secondary' : 'btn-primary'}
            onClick={() => onToggleTestMode(!settings.votingTestMode)}
          >
            {settings.votingTestMode ? 'Desativar modo teste' : 'Ativar modo teste'}
          </button>
          {testVotes > 0 && <button className="btn-danger" onClick={onClearTestVotes}><Trash2 className="h-4 w-4" /> Limpar votos</button>}
        </div>
      </div>
    </section>
  );
}

function SummaryAdmin({
  settings,
  participants,
  totalVotes,
  onGoParticipants,
  onGoSettings,
}: {
  settings: EventSettings;
  participants: Participant[];
  totalVotes: number;
  onGoParticipants: () => void;
  onGoSettings: () => void;
}) {
  const active = participants.filter((participant) => participant.active);
  const withPhoto = active.filter((participant) => !!participant.photoUrl);
  const missingPhotos = active.length - withPhoto.length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-ember" />
          <h2 className="text-lg font-bold text-white">Status do evento</h2>
        </div>
        <StatusRow label="Cadastros" value={registrationStatusLabel(settings)} tone={settings.registrationOpen ? 'success' : 'neutral'} />
        <StatusRow label="Votação" value={votingStatusLabel(settings)} tone={settings.votingTestMode ? 'warning' : settings.votingState === 'OPEN' ? 'success' : 'info'} />
        <StatusRow
          label="Resultado"
          value={settings.votingState === 'RESULT_PUBLISHED' ? 'Publicado' : 'Aguardando'}
          tone={settings.votingState === 'RESULT_PUBLISHED' ? 'success' : 'info'}
        />
        <StatusRow label="Total de votos" value={totalVotes} tone="neutral" />
      </div>
      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-ember" />
          <h2 className="text-lg font-bold text-white">Preparação para a festa</h2>
        </div>
        <Readiness label="Participantes cadastrados" value={participants.length} ok={participants.length > 0} />
        <Readiness label="Com foto" value={withPhoto.length} ok={withPhoto.length === active.length && active.length > 0} />
        <Readiness label="Sem foto" value={missingPhotos} ok={missingPhotos === 0} />
        <Readiness label="Cadastros" value={registrationStatusLabel(settings)} ok={settings.registrationOpen} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 py-3 last:border-0">
          <span className="text-sm text-white/65">Data da festa</span>
          {settings.eventDate
            ? <span className="text-right text-sm font-semibold text-white">{formatEventDate(settings)}</span>
            : <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Não configurada</span>
                <button className="text-sm font-semibold text-ember transition hover:text-orange-200" onClick={onGoSettings}>Configurar</button>
              </div>}
        </div>
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
    <RankingBoard
      mode={results?.isTestResult ? 'test' : results?.final ? 'final' : 'live'}
      results={results}
      updatedAt={results?.updatedAt}
      variant="admin"
    />
  );
}

function ParticipantsAdmin({
  participants,
  onCreate,
  onEdit,
  onDelete,
}: {
  participants: Participant[];
  onCreate: () => void;
  onEdit: (p: Participant) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={onCreate}><Plus className="h-4 w-4" /> Cadastrar participante</button>
      </div>
      {participants.map((participant) => (
        <div key={participant.id} className="halloween-card flex flex-col gap-4 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 gap-4">
            <div className="participant-photo-frame h-28 w-24 shrink-0 rounded-xl">
              {participant.photoUrl ? (
                <img src={participant.photoUrl} alt={participant.costumeName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  <Sparkles className="h-8 w-8 text-ember" />
                </div>
              )}
            </div>
            <div className="min-w-0 self-center">
              <span className={`participant-status ${participant.active ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-white/12 bg-white/8 text-white/55'}`}>
                {participant.active ? 'Pronto para votação' : 'Inativo'}
              </span>
              <p className="mt-3 truncate font-bold text-white">{participant.name}</p>
              <p className="truncate text-ember">{participant.costumeName}</p>
              <p className="text-sm text-white/50">{participant.photoUrl ? 'Foto cadastrada' : 'Sem foto'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button className="btn-secondary" onClick={() => onEdit(participant)}><Edit3 className="h-4 w-4" /> Editar</button>
            <button className="btn-secondary" onClick={() => onDelete(participant.id)}><Trash2 className="h-4 w-4" /> Excluir</button>
          </div>
        </div>
      ))}
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
        <div className="mx-auto grid aspect-square w-[min(300px,78vw)] place-items-center rounded-lg border border-white/10 bg-white p-5">
          <QRCodeSVG value={registrationUrl} className="h-full w-full" bgColor="#ffffff" fgColor="#111111" marginSize={4} />
        </div>
        <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">{registrationUrl}</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href="/cadastro" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir página</a>
          <button className="btn-primary" type="button" onClick={onDownloadRegistration}><Download className="h-4 w-4" /> Baixar QR</button>
          <button className="btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(registrationUrl)}><Copy className="h-4 w-4" /> Copiar link</button>
        </div>
      </div>
      <div className="card grid gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-ember">QR Code de Votação — Halloween</p>
          <h2 className="mt-1 text-2xl font-black text-white">Votação</h2>
          <p className="mt-2 text-white/65">Disponível antes, durante e depois da votação. A página /votar muda conforme o status.</p>
          <p className="mt-2 text-sm font-bold text-white/70">Status: {votingStatusLabel(settings)}</p>
        </div>
        <div className="mx-auto grid aspect-square w-[min(300px,78vw)] place-items-center rounded-lg border border-white/10 bg-white p-5">
          <QRCodeSVG value={voteUrl} className="h-full w-full" bgColor="#ffffff" fgColor="#111111" marginSize={4} />
        </div>
        <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/65">{voteUrl}</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href="/votar" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Pré-visualizar</a>
          <button className="btn-primary" type="button" onClick={onDownload}><Download className="h-4 w-4" /> Baixar QR</button>
          <button className="btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(voteUrl)}><Copy className="h-4 w-4" /> Copiar link</button>
          <a className="btn-secondary" href="/admin/qr" target="_blank" rel="noreferrer"><Monitor className="h-4 w-4" /> Abrir tela cheia</a>
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
    <div className="flex items-center justify-between gap-3 border-b border-white/8 py-3 last:border-0">
      <span className="text-sm text-white/65">{label}</span>
      <span className={ok ? 'font-bold text-emerald-200' : 'font-bold text-amber-100'}>{value}</span>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'success' | 'warning' | 'info' | 'neutral';
}) {
  const color = {
    success: 'bg-emerald-300',
    warning: 'bg-amber-300',
    info: 'bg-sky-300',
    neutral: 'bg-white/40',
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 py-3 last:border-0">
      <span className="text-sm text-white/65">{label}</span>
      <span className="flex items-center gap-2 text-right text-sm font-semibold text-white">
        {typeof value === 'string' && <span className={`status-dot ${color}`} />}
        {value}
      </span>
    </div>
  );
}

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function SettingsAdmin({ settings, onSave }: { settings: EventSettings; onSave: (settings: EventSettings) => Promise<boolean> }) {
  const [draft, setDraft] = useState<EventSettings>(() => settingsToDraft(settings));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!dirty) setDraft(settingsToDraft(settings));
  }, [settings, dirty]);

  function updateDraft(changes: Partial<EventSettings>) {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateDateTimeOrder(draft);
    if (validationMessage) {
      setFormError(validationMessage);
      toast.error(validationMessage);
      return;
    }

    setSaving(true);
    const saved = await onSave(settingsPayload(draft));
    setSaving(false);
    if (saved) {
      setDirty(false);
      setFormError('');
    }
  }

  return (
    <form className="card grid gap-4" onSubmit={handleSubmit}>
      <input className="input" value={draft.eventName} onChange={(e) => updateDraft({ eventName: e.target.value })} />
      <input className="input" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} />
      <textarea className="input min-h-24" value={draft.description ?? ''} onChange={(e) => updateDraft({ description: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" type="date" value={draft.eventDate ?? ''} onChange={(e) => updateDraft({ eventDate: e.target.value })} />
        <input className="input" type="time" value={draft.eventTime ?? ''} onChange={(e) => updateDraft({ eventTime: e.target.value })} />
        <input className="input" type="time" value={draft.votingEndTime ?? ''} onChange={(e) => updateDraft({ votingEndTime: e.target.value })} aria-label="Encerramento da votação" />
        <input className="input" value={draft.timezone ?? SAO_PAULO_TIMEZONE} onChange={(e) => updateDraft({ timezone: e.target.value })} placeholder="America/Sao_Paulo" aria-label="Timezone" />
      </div>
      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div>
          <p className="text-sm font-bold uppercase text-ember">Votação</p>
          <p className="text-sm text-white/55">Controle oficial em America/Sao_Paulo</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-white/80">
            Abertura
            <input className="input" type="datetime-local" value={draft.votingStartsAt ?? ''} onChange={(e) => updateDraft({ votingStartsAt: e.target.value })} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/80">
            Encerramento
            <input className="input" type="datetime-local" value={draft.votingEndsAt ?? ''} onChange={(e) => updateDraft({ votingEndsAt: e.target.value })} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/80">
            Resultado final
            <input className="input" type="datetime-local" value={draft.resultsRevealAt ?? ''} onChange={(e) => updateDraft({ resultsRevealAt: e.target.value })} />
          </label>
        </div>
        {formError && <p className="text-sm font-semibold text-amber-100" role="alert">{formError}</p>}
      </div>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.registrationOpen} onChange={(e) => updateDraft({ registrationOpen: e.target.checked })} /> Cadastro aberto</label>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.votingTestMode} onChange={(e) => updateDraft({ votingTestMode: e.target.checked })} /> Modo de teste da votação</label>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.showLiveResults} onChange={(e) => updateDraft({ showLiveResults: e.target.checked })} /> Exibir resultado parcial durante votação</label>
      <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.resultsPublic} onChange={(e) => updateDraft({ resultsPublic: e.target.checked, showPublicResults: e.target.checked })} /> Resultado público</label>
      <button className="btn-primary w-full" disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</button>
    </form>
  );
}

function settingsToDraft(settings: EventSettings): EventSettings {
  const timezone = normalizeTimezone(settings.timezone);
  return {
    ...settings,
    timezone,
    votingStartsAt: toDateTimeLocal(settings.votingStartsAt ?? settings.votingStart, timezone),
    votingEndsAt: toDateTimeLocal(settings.votingEndsAt ?? settings.votingEnd, timezone),
    resultsRevealAt: toDateTimeLocal(settings.resultsRevealAt, timezone),
    votingStart: undefined,
    votingEnd: undefined,
  };
}

function settingsPayload(draft: EventSettings): EventSettings {
  return {
    ...draft,
    timezone: normalizeTimezone(draft.timezone),
    votingStartsAt: emptyToNull(draft.votingStartsAt),
    votingEndsAt: emptyToNull(draft.votingEndsAt),
    resultsRevealAt: emptyToNull(draft.resultsRevealAt),
    votingStart: undefined,
    votingEnd: undefined,
    votingStatus: 'SCHEDULED',
    votingOpen: false,
  };
}

function toDateTimeLocal(value?: string | null, timezone = SAO_PAULO_TIMEZONE) {
  if (!value) return '';
  if (DATE_TIME_LOCAL_PATTERN.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateTimeInZone(date, timezone);
}

function formatDateTimeInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: normalizeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

function validateDateTimeOrder(draft: EventSettings) {
  const start = parseDateTimeLocal(draft.votingStartsAt);
  const end = parseDateTimeLocal(draft.votingEndsAt);
  const reveal = parseDateTimeLocal(draft.resultsRevealAt);
  if (start === 'invalid') return 'Abertura deve ter uma data e hora válidas.';
  if (end === 'invalid') return 'Encerramento deve ter uma data e hora válidos.';
  if (reveal === 'invalid') return 'Resultado final deve ter uma data e hora válidos.';
  if (start !== null && end !== null && end <= start) return 'Encerramento deve ser posterior à abertura.';
  if (end !== null && reveal !== null && reveal <= end) return 'Resultado final deve ser posterior ao encerramento.';
  if (start !== null && reveal !== null && reveal <= start) return 'Resultado final deve ser posterior à abertura.';
  return '';
}

function parseDateTimeLocal(value?: string | null) {
  if (!value) return null;
  const match = DATE_TIME_LOCAL_PATTERN.exec(value);
  if (!match) return 'invalid';
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
  ) return 'invalid';
  return date.getTime();
}

function normalizeTimezone(value?: string | null) {
  return value?.trim() || SAO_PAULO_TIMEZONE;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value : null;
}

function ParticipantModal({
  participant,
  open,
  title,
  onClose,
  onSave,
}: {
  participant?: Participant | null;
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (p: ParticipantFormValues) => void;
}) {
  const [draft, setDraft] = useState<ParticipantFormValues>(() => participantToForm(participant));
  const [photo, setPhoto] = useState<File | null>(null);
  useEffect(() => {
    setDraft(participantToForm(participant));
    setPhoto(null);
  }, [participant, open]);
  if (!open) return null;
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...draft, photo });
      }}>
        <label className="grid gap-2 text-sm font-semibold text-white/80">
          Nome do participante ou grupo
          <input className="input" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/80">
          Nome da fantasia
          <input className="input" required value={draft.costumeName} onChange={(e) => setDraft({ ...draft, costumeName: e.target.value })} />
        </label>
        <PhotoUpload
          file={photo}
          onChange={(file) => {
            setPhoto(file);
            if (file) setDraft({ ...draft, removePhoto: false });
          }}
          currentUrl={draft.removePhoto ? null : draft.photoUrl}
          onRemoveCurrent={() => setDraft({ ...draft, removePhoto: true })}
        />
        <label className="grid gap-2 text-sm font-semibold text-white/80">
          Descrição
          <textarea className="input min-h-24" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </label>
        <label className="flex gap-3 text-white/75"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Participante ativo</label>
        <button className="btn-primary">Salvar</button>
      </form>
    </Modal>
  );
}

function participantToForm(participant?: Participant | null): ParticipantFormValues {
  return {
    id: participant?.id,
    name: participant?.name ?? '',
    costumeName: participant?.costumeName ?? '',
    description: participant?.description ?? '',
    active: participant?.active ?? true,
    photoUrl: participant?.photoUrl ?? null,
    removePhoto: false,
  };
}
