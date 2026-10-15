import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Trophy, Vote } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { EventStatus } from '../components/halloween/EventStatus';
import { ParticipationJourney } from '../components/halloween/ParticipationJourney';
import { VotingPortal } from '../components/halloween/VotingPortal';
import { eventPhase, formatEventDate } from '../services/eventPhase';
import type { EventSettingsState } from '../services/useEventSettings';

export function HomePage() {
  const event = useOutletContext<EventSettingsState>();
  const { settings, loading, error, refresh } = event;
  const phase = settings ? eventPhase(settings) : null;
  const eventDate = formatEventDate(settings);
  const canSeeResults = phase === 'FINISHED' && settings?.showPublicResults && settings.votingState !== 'RESULT_PENDING';

  return (
    <>
      <section className="cinematic-hero" aria-labelledby="halloween-title">
        <div className="scene-caption" aria-hidden="true"><span />Uma noite fora do comum<span className="scene-caption-index">01 / 03</span></div>
        <div className="hero-content">
          <div className="hero-heading">
            <p className="eyebrow hero-eyebrow"><span aria-hidden="true" />O encontro das suas outras versões</p>
            <h1 id="halloween-title">Halloween</h1>
            <p className="hero-tagline">Há noites em que você{' '}<br />pode ser <em>outra pessoa.</em></p>
          </div>
          <div className="hero-event-details">
            {eventDate && <p className="hero-date"><CalendarDays aria-hidden="true" /><time dateTime={settings?.eventDate}>{eventDate}</time></p>}
            <EventStatus {...event} />
          </div>
          {error && !settings && <div className="event-feedback" role="alert"><p>Não foi possível carregar as informações do evento.</p><button type="button" className="text-action" disabled={loading} onClick={refresh}>{loading ? 'Consultando…' : 'Tentar novamente'}</button></div>}
          <div className="hero-actions">
            {phase === 'REGISTRATION' && <Link className="btn-primary hero-primary" to="/cadastro">Cadastrar minha fantasia <ArrowRight aria-hidden="true" /></Link>}
            {phase === 'VOTING' && <Link className="btn-primary hero-primary" to="/votar"><Vote aria-hidden="true" />{settings?.votingState === 'TEST' ? 'Experimentar votação' : 'Votar agora'}<ArrowRight aria-hidden="true" /></Link>}
            {canSeeResults && <Link className="btn-primary hero-primary" to="/resultado"><Trophy aria-hidden="true" />Ver resultado<ArrowRight aria-hidden="true" /></Link>}
            <Link className="btn-secondary hero-secondary" to="/participantes">Ver participantes <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          {phase === 'PREPARATION' && <p className="hero-phase-note">As inscrições se encerraram. Prepare sua escolha para a grande noite.</p>}
          {phase === 'FINISHED' && !canSeeResults && <p className="hero-phase-note">A votação se encerrou. {settings?.votingState === 'RESULT_PENDING' ? 'O resultado será revelado em breve.' : 'Obrigado por participar desta noite.'}</p>}
          <VotingPortal event={event} />
        </div>
        <a href="#como-participar" className="hero-scroll"><ArrowDown aria-hidden="true" /><span>Descubra como participar</span></a>
      </section>
      <ParticipationJourney phase={phase} />
    </>
  );
}
