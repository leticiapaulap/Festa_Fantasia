import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PhotoCamera, PhotoDepthRenderer } from './photoDepthRenderer';
import { createSceneAnimation } from './sceneAnimation';

export function usePhotoDepth(canvas: RefObject<HTMLCanvasElement>, photograph: RefObject<HTMLImageElement>, camera: RefObject<PhotoCamera>, enabled: boolean, paused: boolean) {
  const [ready, setReady] = useState(false);
  const pause = useRef(paused);
  const playback = useRef<{ resume: () => void; pause: () => void } | null>(null);
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
    let version = 0;
    let painted = false;

    const animation = createSceneAnimation((seconds) => {
      if (cancelled || pause.current || document.hidden) {
        animation.pause();
        return;
      }
      if (renderer?.draw(motion, seconds) && !painted) {
        painted = true;
        setReady(true);
      }
    });
    const resume = () => {
      if (renderer && !pause.current && !document.hidden && !cancelled) animation.resume();
    };
    playback.current = { resume, pause: animation.pause };
    const scheduleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        renderer?.resize();
        if (!pause.current) renderer?.draw(motion, animation.time);
      });
    };
    const initialize = async () => {
      const initialization = ++version;
      try {
        const module = await import('./photoDepthRenderer');
        await image.decode();
        if (cancelled || initialization !== version) return;
        depth.src = '/assets/halloween-invitation-depth.svg';
        await depth.decode();
        if (cancelled || initialization !== version) return;
        renderer?.dispose();
        renderer = module.createPhotoDepthRenderer(surface, image, depth);
        if (!renderer) return;
        motion.render = resume;
        resume();
      } catch {
        if (cancelled || initialization !== version) return;
        animation.pause();
        renderer?.dispose();
        renderer = null;
        painted = false;
        setReady(false);
      }
    };
    const start = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void initialize(); }, 100);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      version += 1;
      painted = false;
      animation.pause();
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
      version += 1;
      animation.pause();
      playback.current = null;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleResize);
      surface.removeEventListener('webglcontextlost', contextLost);
      surface.removeEventListener('webglcontextrestored', start);
      if (motion.render === resume) motion.render = undefined;
      renderer?.dispose();
    };
  }, [canvas, photograph, camera, enabled]);

  useEffect(() => {
    if (paused) playback.current?.pause();
    else playback.current?.resume();
  }, [paused]);

  return enabled && ready;
}
