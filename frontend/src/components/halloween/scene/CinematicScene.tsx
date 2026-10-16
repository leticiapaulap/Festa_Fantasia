import { useRef } from 'react';
import { SceneFog } from './SceneFog';
import { SceneLighting } from './SceneLighting';
import { SceneParticles } from './SceneParticles';
import { ScenePhotograph } from './ScenePhotograph';
import { useCinematicCamera } from './useCinematicCamera';
import { useSceneEnvironment } from './useSceneEnvironment';

export function CinematicScene({ home = false }: { home?: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const { quality, paused } = useSceneEnvironment(scene, home);
  useCinematicCamera(scene, home && quality === 'full' && !paused);

  return (
    <div ref={scene} className={`cinematic-scene ${home ? 'scene-home' : 'scene-interior'}`} data-quality={quality} data-paused={paused} data-lite={quality === 'static'} aria-hidden="true">
      <div className="scene-lens">
        <div className="scene-camera-float">
          <div className="scene-camera-rig">
            <ScenePhotograph />
            <div className="scene-atmosphere">
              <SceneLighting />
              <SceneFog />
              <SceneParticles />
            </div>
          </div>
        </div>
      </div>
      <div className="scene-shade" />
    </div>
  );
}
