import { CinematicScene } from './halloween/scene/CinematicScene';

export function HalloweenDecor({ home = false }: { home?: boolean }) {
  return <CinematicScene home={home} />;
}
