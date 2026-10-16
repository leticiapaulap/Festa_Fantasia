import { eventPhase } from '../../services/eventPhase';
import type { EventSettings } from '../../types/api';

export function EventStatus({ settings, loading, error }: { settings: EventSettings | null; loading: boolean; error: string }) {
  const phase = settings ? eventPhase(settings) : null;
  const label = !settings
    ? loading ? 'Consultando o evento' : 'Informações indisponíveis'
    : error ? 'Atualização indisponível'
    : settings.votingState === 'TEST' ? 'Votação em teste'
    : settings.votingState === 'RESULT_PUBLISHED' ? 'Resultado disponível'
    : settings.votingState === 'RESULT_PENDING' ? 'Resultado em breve'
    : phase === 'VOTING' ? 'Votação aberta'
    : phase === 'REGISTRATION' ? 'Inscrições abertas'
    : phase === 'FINISHED' ? 'Votação encerrada' : 'Inscrições encerradas';

  return (
    <span className="event-status" data-phase={error ? 'unavailable' : phase?.toLowerCase()} role="status">
      <span className="event-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
