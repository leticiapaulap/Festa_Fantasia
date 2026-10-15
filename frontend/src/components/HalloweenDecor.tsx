import { useEffect, useRef, useState } from 'react';

export function HalloweenDecor({ home = false }: { home?: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(() => document.hidden);
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const lightweight = !!connection?.saveData || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);

  useEffect(() => {
    const updateVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine) and (min-width: 900px)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!home || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || connection?.saveData) return;
    let frame = 0;
    function reset() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      scene.current?.style.setProperty('--scene-x', '0px');
      scene.current?.style.setProperty('--scene-y', '0px');
    }
    function move(event: PointerEvent) {
      if (!motion.matches || document.hidden || frame) return;
      const horizontal = (event.clientX / window.innerWidth - 0.5) * 10;
      const vertical = (event.clientY / window.innerHeight - 0.5) * 6;
      frame = window.requestAnimationFrame(() => {
        scene.current?.style.setProperty('--scene-x', `${horizontal}px`);
        scene.current?.style.setProperty('--scene-y', `${vertical}px`);
        frame = 0;
      });
    }
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', reset);
    motion.addEventListener('change', reset);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
    };
  }, [home]);

  return (
    <div ref={scene} className={`cinematic-scene ${home ? 'scene-home' : 'scene-interior'}`} data-paused={paused} data-lite={lightweight} aria-hidden="true">
      <picture className="scene-picture">
        <source type="image/webp" srcSet="/assets/halloween-invitation-background.webp" />
        <img className="scene-photo" src="/assets/halloween-invitation-background.png" width="1672" height="941" alt="" fetchPriority="high" decoding="async" />
      </picture>
      <div className="scene-shade" />
      <div className="scene-atmosphere">
        <span className="ambient-light ambient-amber" />
        <span className="ambient-light ambient-violet" />
        <span className="scene-fog fog-near" />
        <span className="scene-fog fog-far" />
        <div className="scene-particles">
          {Array.from({ length: 7 }, (_, index) => <span className="scene-ember" key={index} />)}
        </div>
      </div>
    </div>
  );
}
