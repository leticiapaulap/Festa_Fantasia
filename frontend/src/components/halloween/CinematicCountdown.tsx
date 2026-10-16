import { useEffect, useRef, useState } from 'react';
import { countdownValues } from '../../services/eventSchedule';

type Props = {
  target: string;
  label: string;
  serverTime?: string;
  receivedAt: number;
  onElapsed?: () => void;
  compact?: boolean;
};

export function CinematicCountdown({ target, label, serverTime, receivedAt, onElapsed, compact = false }: Props) {
  const targetTime = new Date(target).getTime();
  const serverTimestamp = serverTime ? new Date(serverTime).getTime() : NaN;
  const [remaining, setRemaining] = useState(() => Math.max(0, targetTime - (Number.isFinite(serverTimestamp) ? serverTimestamp : Date.now())));
  const notified = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const update = () => {
      const now = Number.isFinite(serverTimestamp)
        ? serverTimestamp + window.performance.now() - receivedAt
        : Date.now();
      const next = Math.max(0, targetTime - now);
      setRemaining(next);
      if (next === 0) window.clearInterval(timer);
      if (next === 0 && notified.current !== targetTime) {
        notified.current = targetTime;
        onElapsed?.();
      }
      return next;
    };
    const resume = () => {
      window.clearInterval(timer);
      if (document.hidden) return;
      if (update() > 0) timer = window.setInterval(update, 1000);
    };
    if (Number.isFinite(targetTime)) resume();
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [targetTime, serverTimestamp, receivedAt, onElapsed]);

  if (!Number.isFinite(targetTime)) return null;

  return (
    <div className={`cinematic-countdown ${compact ? 'countdown-compact' : ''}`} role="timer" aria-label={label} aria-live="off">
      <p className="countdown-label">{remaining > 0 ? label : 'Aguardando atualização do evento'}</p>
      <dl className="countdown-units">
        {countdownValues(remaining).map(({ value, label: unit }) => (
          <div className="countdown-unit" key={unit}>
            <dt>{unit}</dt>
            <dd><span className="countdown-numeral" key={value}>{String(value).padStart(2, '0')}</span></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
