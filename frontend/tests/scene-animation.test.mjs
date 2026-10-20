import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new globalThis.URL('../src/components/halloween/scene/sceneAnimation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { createSceneAnimation } = await import(`data:text/javascript,${encodeURIComponent(compiled.outputText)}`);

function animationFixture(paint = () => {}) {
  let sequence = 0;
  const callbacks = new Map();
  const times = [];
  const animation = createSceneAnimation((time) => { times.push(time); paint(time); }, {
    request: (callback) => { callbacks.set(++sequence, callback); return sequence; },
    cancel: (request) => callbacks.delete(request),
  });
  return {
    animation, callbacks, times,
    step: (timestamp) => {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      for (const [, callback] of pending) callback(timestamp);
    },
  };
}

test('a 120 Hz display cannot exceed the 24 fps atmospheric draw budget', () => {
  const { animation, times, callbacks, step } = animationFixture();
  animation.resume();
  animation.resume();
  for (let frame = 0; frame <= 1200; frame += 1) {
    assert.equal(callbacks.size, 1);
    step(frame * 1000 / 120);
  }
  assert.ok(times.length >= 239 && times.length <= 241, String(times.length));
  assert.ok(Math.abs(animation.time - 10) < 0.001);
  animation.pause();
  assert.equal(callbacks.size, 0);
});

test('pausing freezes the timeline and resuming never jumps over hidden time', () => {
  const { animation, callbacks, times, step } = animationFixture();
  animation.resume();
  step(100);
  step(150);
  animation.pause();
  const time = animation.time;
  const count = times.length;
  step(100000);
  assert.equal(times.length, count);
  assert.equal(callbacks.size, 0);
  animation.resume();
  step(100000);
  assert.equal(animation.time, time);
  step(100050);
  assert.ok(Math.abs(animation.time - time - 0.05) < 0.001);
  animation.pause();
});

test('stalls and reversed timestamps cannot produce an abrupt camera time jump', () => {
  const { animation, step } = animationFixture();
  animation.resume();
  step(100);
  step(10000);
  assert.equal(animation.time, 0.1);
  step(9990);
  assert.equal(animation.time, 0.1);
  animation.pause();
});

test('pausing inside a paint callback does not leave a scheduled frame', () => {
  const fixture = animationFixture(() => fixture.animation.pause());
  fixture.animation.resume();
  fixture.step(0);
  assert.equal(fixture.callbacks.size, 0);
  assert.deepEqual(fixture.times, [0]);
});
