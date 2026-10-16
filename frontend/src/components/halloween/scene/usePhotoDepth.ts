import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PhotoCamera, PhotoDepthRenderer } from './photoDepthRenderer';

export function usePhotoDepth(canvas: RefObject<HTMLCanvasElement>, photograph: RefObject<HTMLImageElement>, camera: RefObject<PhotoCamera>, enabled: boolean, paused: boolean) {
  const [ready, setReady] = useState(false);
  const pause = useRef(paused);
  pause.current = paused;

  useEffect(() => {
    setReady(false);
    if (!enabled || !canvas.current || !photograph.current || !camera.current) return;
    const surface = canvas.current;
    const image = photograph.current;
    const motion = camera.current;
    const depth = new window.Image();
    let cancelled = false;
    let renderer: PhotoDepthRenderer | null = null;
    let frame = 0;
    let timer = 0;

    const draw = () => {
      if (!pause.current) renderer?.draw(motion);
    };
    const scheduleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        renderer?.resize();
        draw();
      });
    };
    const initialize = async () => {
      try {
        const module = await import('./photoDepthRenderer');
        await image.decode();
        if (cancelled) return;
        depth.src = '/assets/halloween-invitation-depth.svg';
        await depth.decode();
        if (cancelled) return;
        renderer = module.createPhotoDepthRenderer(surface, image, depth);
        if (!renderer) return;
        motion.render = draw;
        draw();
        setReady(true);
      } catch {
        renderer?.dispose();
        renderer = null;
      }
    };
    const start = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void initialize(); }, 100);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setReady(false);
      renderer?.dispose();
      renderer = null;
      motion.render = undefined;
    };
    const observer = 'ResizeObserver' in window ? new window.ResizeObserver(scheduleResize) : null;
    observer?.observe(surface);
    if (!observer) window.addEventListener('resize', scheduleResize, { passive: true });
    surface.addEventListener('webglcontextlost', contextLost);
    surface.addEventListener('webglcontextrestored', start);
    start();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleResize);
      surface.removeEventListener('webglcontextlost', contextLost);
      surface.removeEventListener('webglcontextrestored', start);
      if (motion.render === draw) motion.render = undefined;
      renderer?.dispose();
    };
  }, [canvas, photograph, camera, enabled]);

  useEffect(() => {
    if (!paused) camera.current?.render?.();
  }, [paused, camera]);

  return enabled && ready;
}
