import { useRef } from 'react';
import { SceneFog } from './SceneFog';
import { SceneLighting } from './SceneLighting';
import { SceneParticles } from './SceneParticles';
import { ScenePhotograph } from './ScenePhotograph';
import { useCinematicCamera } from './useCinematicCamera';
import { useSceneEnvironment } from './useSceneEnvironment';
import type { PhotoCamera } from './photoDepthRenderer';

export function CinematicScene({ home = false }: { home?: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const camera = useRef<PhotoCamera>({ horizontal: 0, vertical: 0 });
  const { quality, paused } = useSceneEnvironment(scene, home);
  useCinematicCamera(scene, home && quality === 'full' && !paused, camera);

  return (
    <div ref={scene} className={`cinematic-scene ${home ? 'scene-home' : 'scene-interior'}`} data-quality={quality} data-paused={paused} data-lite={quality === 'static'} aria-hidden="true">
      <div className="scene-lens">
        <div className="scene-camera-float">
          <div className="scene-camera-rig">
            <ScenePhotograph camera={camera} depth={home && quality === 'full'} paused={paused} />
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
