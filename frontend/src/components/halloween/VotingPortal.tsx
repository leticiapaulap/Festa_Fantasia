import { ArrowUpRight, Check, Copy, Hourglass, Trophy, Vote } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventPhase } from '../../services/eventPhase';
import { getPartyStart } from '../../services/eventSchedule';
import { publicVotingUrl } from '../../services/publicUrl';
import type { EventSettingsState } from '../../services/useEventSettings';
import { CinematicCountdown } from './CinematicCountdown';

export function VotingPortal({ event }: { event: EventSettingsState }) {
  const { settings, loading, error, refresh, receivedAt } = event;
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const feedbackTimer = useRef<number>();
  const phase = settings ? eventPhase(settings) : null;
  const available = phase === 'VOTING';
  const finished = phase === 'FINISHED';
  const published = settings?.votingState === 'RESULT_PUBLISHED';
  const pending = settings?.votingState === 'RESULT_PENDING';
  const partyStartsAt = getPartyStart(settings);
  const target = available ? settings?.votingEndsAt
    : pending ? settings?.resultsRevealAt
    : !finished ? settings?.votingStartsAt ?? settings?.votingStart : null;
  const voteUrl = publicVotingUrl();
  const separatePartyCountdown = partyStartsAt && target && partyStartsAt.getTime() !== new Date(target).getTime();

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  async function copyVoting() {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setCopied(true);
      setCopyError('');
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('Selecione o link para copiar manualmente.');
    }
  }

  const title = !phase ? 'A noite está chegando.'
    : available ? 'A escolha está em suas mãos.'
    : published ? 'A noite tem seus destaques.'
    : finished ? 'O mistério continua.' : 'O grande momento se aproxima.';

  return (
    <aside className="voting-portal" aria-labelledby="portal-title" aria-busy={loading && !settings}>
      <div className="portal-heading">
        <span className="portal-sigil" aria-hidden="true">{available ? <Vote /> : finished ? <Trophy /> : <Hourglass />}</span>
        <div>
          <p className="eyebrow">{available ? settings?.votingState === 'TEST' ? 'Votação em teste' : 'Votação aberta' : finished ? 'Depois da meia-noite' : 'Prepare sua escolha'}</p>
          <h2 id="portal-title">{title}</h2>
        </div>
      </div>

      {!settings && <p className="portal-description" role="status">{loading ? 'Consultando os horários do evento…' : 'Os horários estarão disponíveis assim que a conexão for restabelecida.'}</p>}
      {settings && !available && !finished && <p className="portal-description">Cada fantasia guarda uma história. Em breve, você escolhe qual delas fica para a eternidade.</p>}
      {pending && <p className="portal-description">Os votos já foram encerrados. Aguarde a divulgação do resultado pela organização.</p>}
      {finished && !pending && <p className="portal-description">{published ? 'Conheça as fantasias que marcaram esta edição.' : 'Obrigado por fazer parte desta noite. A votação foi encerrada.'}</p>}

      {target && <CinematicCountdown target={target} serverTime={settings?.serverTime} receivedAt={receivedAt} onElapsed={refresh} label={available ? 'A votação encerra em' : pending ? 'O resultado será revelado em' : 'A votação abre em'} />}
      {separatePartyCountdown && !available && !finished && <CinematicCountdown compact target={partyStartsAt.toISOString()} serverTime={settings?.serverTime} receivedAt={receivedAt} label="A festa começa em" />}
      {settings && !target && !available && !finished && <p className="portal-description">A organização divulgará o horário de abertura da votação.</p>}
      {partyStartsAt && !available && !finished && (
        <p className="party-time">A festa começa em <time dateTime={partyStartsAt.toISOString()}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: settings?.timezone || 'America/Sao_Paulo' }).format(partyStartsAt)}</time></p>
      )}

      {available && (
        <div className="portal-voting-access">
          <div className="portal-qr"><QRCodeSVG value={voteUrl} size={112} bgColor="#E9D8BA" fgColor="#0D0912" marginSize={2} title="QR Code para acessar a votação" /></div>
          <div className="portal-share">
            <p>{settings?.votingState === 'TEST' ? 'Votos de teste ficam separados da votação oficial.' : 'Escaneie o QR Code ou abra a votação para escolher sua favorita.'}</p>
            <label htmlFor="voting-url" className="sr-only">Link da votação</label>
            <input id="voting-url" className="portal-url" value={voteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className="portal-copy" onClick={() => void copyVoting()}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Link copiado' : 'Copiar link'}</button>
            <span className="sr-only" role="status">{copied ? 'Link da votação copiado.' : ''}</span>
            {copyError && <p className="copy-error" role="status">{copyError}</p>}
          </div>
        </div>
      )}
      {available && <Link className="portal-link" to="/votar">Entrar na votação <ArrowUpRight aria-hidden="true" /></Link>}
      {finished && settings?.showPublicResults && !pending && <Link className="portal-link" to="/resultado">Conhecer o resultado <ArrowUpRight aria-hidden="true" /></Link>}
      {error && settings && <p className="portal-description" role="status">A atualização está temporariamente indisponível. <button className="text-action" type="button" onClick={refresh}>Tentar novamente</button></p>}
    </aside>
  );
}
