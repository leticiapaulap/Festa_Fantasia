import { useRef, type RefObject } from 'react';
import type { PhotoCamera } from './photoDepthRenderer';
import { usePhotoDepth } from './usePhotoDepth';

export function ScenePhotograph({ camera, depth, paused }: { camera: RefObject<PhotoCamera>; depth: boolean; paused: boolean }) {
  const photograph = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ready = usePhotoDepth(canvas, photograph, camera, depth, paused);
  return (
    <div className="scene-depth-plane scene-depth-photo" data-scene-layer="photograph" data-depth-state={ready ? 'ready' : 'fallback'}>
      <picture className="scene-picture">
        <source type="image/webp" srcSet="/assets/halloween-invitation-background.webp" />
        <img ref={photograph} className="scene-photo" src="/assets/halloween-invitation-background.png" width="1672" height="941" alt="" fetchPriority="high" decoding="async" draggable={false} />
      </picture>
      {depth && <canvas ref={canvas} className="scene-photo-depth" aria-hidden="true" />}
    </div>
  );
}
