import { useEffect, type RefObject } from 'react';

export function useCinematicCamera(scene: RefObject<HTMLDivElement>, active: boolean) {
  useEffect(() => {
    if (!scene.current) return;
    const element = scene.current;
    let frame = 0;
    let lastFrame = 0;
    let horizontal = 0;
    let vertical = 0;
    let targetHorizontal = 0;
    let targetVertical = 0;

    const paint = () => {
      element.style.setProperty('--camera-x', horizontal.toFixed(5));
      element.style.setProperty('--camera-y', vertical.toFixed(5));
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      horizontal = 0;
      vertical = 0;
      paint();
      element.dataset.cameraMoving = 'false';
    };
    reset();
    if (!active) return reset;

    function interpolate(timestamp: number) {
      const elapsed = Math.min(64, Math.max(0, timestamp - lastFrame));
      const blend = 1 - Math.exp(-elapsed / 170);
      lastFrame = timestamp;
      horizontal += (targetHorizontal - horizontal) * blend;
      vertical += (targetVertical - vertical) * blend;
      const settled = Math.abs(targetHorizontal - horizontal) + Math.abs(targetVertical - vertical) < 0.0008;
      if (settled) {
        horizontal = targetHorizontal;
        vertical = targetVertical;
      }
      paint();
      if (!settled) {
        frame = window.requestAnimationFrame(interpolate);
      } else {
        frame = 0;
        element.dataset.cameraMoving = 'false';
      }
    }

    function start() {
      if (frame || document.hidden) return;
      element.dataset.cameraMoving = 'true';
      lastFrame = window.performance.now();
      frame = window.requestAnimationFrame(interpolate);
    }

    function follow(event: PointerEvent) {
      if (event.pointerType === 'touch' || document.hidden) return;
      targetHorizontal = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      targetVertical = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      start();
    }

    function center() {
      targetHorizontal = 0;
      targetVertical = 0;
      start();
    }

    window.addEventListener('pointermove', follow, { passive: true });
    window.addEventListener('blur', center);
    document.addEventListener('pointerleave', center);
    return () => {
      reset();
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('blur', center);
      document.removeEventListener('pointerleave', center);
    };
  }, [active, scene]);
}
