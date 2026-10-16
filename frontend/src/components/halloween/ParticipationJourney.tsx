import { useEffect, useRef, useState } from 'react';
import type { EventPhase } from '../../services/eventPhase';

const registrationSteps = [
  { title: 'Cadastre sua fantasia', detail: 'Dê um nome à sua outra identidade.' },
  { title: 'Envie sua fotografia', detail: 'Um registro à altura do personagem.' },
  { title: 'Aguarde a votação', detail: 'Na grande noite, a escolha é de todos.' },
];
const votingSteps = [
  { title: 'Encontre sua favorita', detail: 'Conheça as fantasias participantes.' },
  { title: 'Confirme seu voto', detail: 'Escolha quem merece marcar a noite.' },
  { title: 'Aguarde o resultado', detail: 'O próximo destaque pode surpreender.' },
];

export function ParticipationJourney({ phase }: { phase: EventPhase | null }) {
  const section = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const isVoting = phase === 'VOTING';

  useEffect(() => {
    if (!section.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setEntered(true);
      observer.disconnect();
    }, { threshold: 0.15 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="como-participar" className="participation-journey" ref={section} data-entered={entered} aria-labelledby="journey-title">
      <div className="journey-intro">
        <p className="eyebrow">O ritual da noite</p>
        <h2 id="journey-title">{isVoting ? 'Toda escolha conta.' : 'Sua transformação começa aqui.'}</h2>
      </div>
      <ol className="journey-steps">
        {(isVoting ? votingSteps : registrationSteps).map(({ title, detail }, index) => (
          <li key={title}>
            <span className="journey-marker" aria-hidden="true">0{index + 1}</span>
            <div><h3>{title}</h3><p>{detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
