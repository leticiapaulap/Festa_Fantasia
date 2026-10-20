type SceneScheduler = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (request: number) => void;
};

export function createSceneAnimation(paint: (seconds: number) => void, scheduler: SceneScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (request) => window.cancelAnimationFrame(request),
}) {
  const interval = 1000 / 24;
  let running = false;
  let request = 0;
  let previous: number | null = null;
  let elapsed = 0;
  let budget = interval;

  const tick = (timestamp: number) => {
    request = 0;
    if (!running) return;
    const delta = previous === null ? 0 : Math.min(100, Math.max(0, timestamp - previous));
    previous = timestamp;
    elapsed += delta / 1000;
    budget += delta;
    if (budget >= interval) {
      budget %= interval;
      paint(elapsed);
    }
    if (running) request = scheduler.request(tick);
  };

  return {
    get time() { return elapsed; },
    resume: () => {
      if (running) return;
      running = true;
      previous = null;
      budget = interval;
      request = scheduler.request(tick);
    },
    pause: () => {
      running = false;
      scheduler.cancel(request);
      request = 0;
      previous = null;
    },
  };
}
