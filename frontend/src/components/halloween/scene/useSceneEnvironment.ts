import { useEffect, useState, type RefObject } from 'react';

type SceneQuality = 'static' | 'ambient' | 'full';
type SceneConnection = EventTarget & { saveData?: boolean };
type SceneNavigator = Navigator & { connection?: SceneConnection; deviceMemory?: number };

function sceneQuality(home: boolean): SceneQuality {
  const device = navigator as SceneNavigator;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce), (update: slow)').matches;
  const lowPower = (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4)
    || (device.deviceMemory !== undefined && device.deviceMemory < 4) || device.connection?.saveData;
  if (!home || reduced || lowPower) return 'static';
  const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
  return desktop && window.CSS?.supports('transform-style', 'preserve-3d') ? 'full' : 'ambient';
}

export function useSceneEnvironment(scene: RefObject<HTMLDivElement>, home: boolean) {
  const [quality, setQuality] = useState<SceneQuality>(() => sceneQuality(home));
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce), (update: slow)'),
      window.matchMedia('(min-width: 900px) and (pointer: fine)'),
    ];
    const connection = (navigator as SceneNavigator).connection;
    const updateQuality = () => setQuality(sceneQuality(home));
    const updateVisibility = () => setVisible(!document.hidden);
    updateQuality();
    updateVisibility();
    for (const query of queries) query.addEventListener('change', updateQuality);
    connection?.addEventListener('change', updateQuality);
    document.addEventListener('visibilitychange', updateVisibility);

    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 }) : null;
    if (scene.current) observer?.observe(scene.current);
    return () => {
      for (const query of queries) query.removeEventListener('change', updateQuality);
      connection?.removeEventListener('change', updateQuality);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer?.disconnect();
    };
  }, [home, scene]);

  return { quality, paused: !home || !visible || !inView };
}
