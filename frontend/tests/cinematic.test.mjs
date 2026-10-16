import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new globalThis.URL('../', import.meta.url));
const requireTool = createRequire(process.env.HALLOWEEN_QA_TOOLS
  ? path.join(process.env.HALLOWEEN_QA_TOOLS, 'package.json') : import.meta.url);
const { chromium } = requireTool('playwright');
const { AxeBuilder } = requireTool('@axe-core/playwright');
const sharp = requireTool('sharp');
const output = process.env.HALLOWEEN_QA_OUTPUT || path.join(tmpdir(), 'halloween-cinematic-results');
const origin = 'http://127.0.0.1:4174';
let browser;
let preview;
let serverOutput = '';

function eventSettings(overrides = {}) {
  return {
    id: 1, eventName: 'Halloween', title: 'Halloween', timezone: 'America/Sao_Paulo',
    eventDate: '2026-11-15', eventTime: '00:00', registrationOpen: true,
    votingOpen: false, resultsPublic: false, showPublicResults: false,
    votingStatus: 'DRAFT', showLiveResults: false, votingTestMode: false,
    canAcceptVotes: false, publicVotingUrl: '/votar', votingAvailability: 'WAITING',
    votingState: 'WAITING', serverTime: '2026-10-15T20:00:00Z',
    votingStartsAt: '2026-11-15T03:00:00Z', votingEndsAt: null, resultsRevealAt: null,
    ...overrides,
  };
}

async function fixture(overrides = {}, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  const state = { settings: eventSettings(overrides), settingsCalls: 0, failSettings: false, submissions: [] };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text());
  });
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new globalThis.URL(request.url()).pathname.replace(/^\/api/, '');
    let body = {};
    if (pathname === '/settings') {
      state.settingsCalls += 1;
      if (state.failSettings) return route.fulfill({ status: 503, json: { message: 'Indisponível' } });
      body = state.settings;
    } else if (pathname === '/participants' && request.method() === 'POST') {
      state.submissions.push(request.postDataBuffer().toString('utf8'));
      body = { success: true, participant: { id: 1, name: 'Participante de teste local', costumeName: 'Fantasia de teste local', active: true, createdAt: '2026-10-15T20:00:00Z' } };
    } else if (pathname === '/participants') {
      body = [];
    } else if (pathname === '/voting/status') {
      body = { ...state.settings, status: state.settings.votingState, hasVoted: false };
    } else if (pathname.includes('results')) {
      body = { status: state.settings.votingState, votingOpen: false, resultsPublic: state.settings.showPublicResults, final: true, isTestResult: false, tie: false, totalVotes: 0, ranking: [], winners: [] };
    } else if (pathname === '/admin/bootstrap/status') {
      body = { available: false };
    } else {
      errors.push(`Unexpected API request: ${request.method()} ${pathname}`);
      return route.fulfill({ status: 400, json: { message: 'Requisição não prevista no teste local.' } });
    }
    return route.fulfill({ json: body });
  });
  return { context, page, state, errors };
}

async function ready(page) {
  await page.goto(origin);
  await page.locator('.hero-event-details .event-status').filter({ hasText: 'Inscrições abertas' }).waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
}

async function assertLayout(page) {
  const bounds = await page.evaluate(() => {
    const range = globalThis.document.createRange();
    range.selectNodeContents(globalThis.document.querySelector('h1'));
    const title = range.getBoundingClientRect();
    return {
      width: globalThis.innerWidth,
      scrollWidth: globalThis.document.documentElement.scrollWidth,
      titleLeft: title.left, titleRight: title.right,
      actions: [...globalThis.document.querySelectorAll('.hero-actions a')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height, width: rect.width };
      }),
    };
  });
  assert.ok(bounds.scrollWidth <= bounds.width, JSON.stringify(bounds));
  assert.ok(bounds.titleLeft >= 0 && bounds.titleRight <= bounds.width, JSON.stringify(bounds));
  for (const action of bounds.actions) {
    assert.ok(action.left >= 0 && action.right <= bounds.width, JSON.stringify(action));
    assert.ok(action.height >= 44 && action.width >= 44);
  }
}

before(async () => {
  await readFile(path.join(frontend, 'dist/index.html'));
  await mkdir(output, { recursive: true });
  preview = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { cwd: frontend, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  preview.stdout.on('data', (chunk) => { serverOutput += chunk; });
  preview.stderr.on('data', (chunk) => { serverOutput += chunk; });
  let running = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(serverOutput);
    try { running = (await globalThis.fetch(origin)).ok; } catch { running = false; }
    if (running) break;
    await delay(100);
  }
  assert.ok(running, serverOutput);
  browser = await chromium.launch(process.env.HALLOWEEN_BROWSER
    ? { executablePath: process.env.HALLOWEEN_BROWSER, headless: true }
    : { channel: 'chrome', headless: true });
});

after(async () => {
  await browser?.close();
  preview?.kill();
  console.log(`Visual QA artifacts: ${output}`);
});

test('original photograph remains byte-for-byte identical', async () => {
  const original = await readFile(path.join(frontend, 'public/assets/halloween-invitation-background.png'));
  assert.equal(createHash('sha256').update(original).digest('hex'), '967e61ca25260c7a6bb2a0221f2d74b925fafde7b51148816da087b884ca4235');
  const optimized = await readFile(path.join(frontend, 'public/assets/halloween-invitation-background.webp'));
  assert.ok(optimized.length < original.length * 0.15);
});

test('desktop and mobile preserve the photo, actions, typography and layout', async () => {
  const { context, page, errors } = await fixture();
  try {
    await ready(page);
    assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'HALLOWEEN');
    assert.equal(await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).getAttribute('href'), '/cadastro');
    assert.equal(await page.locator('.hero-secondary').getAttribute('href'), '/participantes');
    assert.equal(await page.locator('.cinematic-scene').getAttribute('aria-hidden'), 'true');
    const photo = await page.locator('.scene-photo').evaluate((element) => ({ src: element.currentSrc, width: element.naturalWidth, height: element.naturalHeight }));
    assert.ok(photo.src.endsWith('halloween-invitation-background.webp'));
    assert.equal(photo.width, 1672);
    assert.equal(photo.height, 941);
    assert.ok(await page.evaluate(() => globalThis.document.fonts.check('500 20px Cinzel') && globalThis.document.fonts.check('400 16px Manrope')));
    for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 900 ? 844 : 1000 });
      await assertLayout(page);
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('mobile menu works by keyboard, closes on Escape and restores focus', async () => {
  const { context, page, errors } = await fixture({}, { viewport: { width: 390, height: 844 } });
  try {
    await ready(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => globalThis.document.activeElement.className), 'skip-link');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    assert.equal(await page.getByRole('button', { name: 'Fechar menu' }).getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Abrir menu' }).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => globalThis.document.activeElement.getAttribute('aria-label')), 'Abrir menu');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.locator('#mobile-navigation').getByRole('link', { name: 'Participantes', exact: true }).click();
    await page.waitForURL(`${origin}/participantes`);
    assert.equal(await page.locator('#mobile-navigation').isVisible(), false);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('all server phases expose the correct actions without relying on the visual clock', async () => {
  for (const scenario of [
    { votingState: 'WAITING', registrationOpen: false, expected: 'Inscrições encerradas', action: null },
    { votingState: 'OPEN', expected: 'Votação aberta', action: 'Votar agora' },
    { votingState: 'TEST', expected: 'Votação em teste', action: 'Experimentar votação' },
    { votingState: 'CLOSED', expected: 'Votação encerrada', action: null },
    { votingState: 'RESULT_PENDING', expected: 'Resultado em breve', action: null, showPublicResults: true, resultsRevealAt: '2026-11-16T03:00:00Z' },
    { votingState: 'RESULT_PUBLISHED', expected: 'Resultado disponível', action: 'Ver resultado', showPublicResults: true },
  ]) {
    const { context, page, errors } = await fixture(scenario, { reducedMotion: 'reduce' });
    try {
      await page.goto(origin);
      await page.locator('.hero-event-details .event-status').filter({ hasText: scenario.expected }).waitFor();
      assert.equal(await page.locator('.hero-primary').count(), scenario.action ? 1 : 0);
      if (scenario.action) assert.equal((await page.locator('.hero-primary').textContent()).trim(), scenario.action);
      if (['OPEN', 'TEST'].includes(scenario.votingState)) {
        assert.equal(await page.locator('.portal-qr svg').count(), 1);
        assert.equal(await page.locator('.portal-link').getAttribute('href'), '/votar');
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), []);
      }
      if (scenario.votingState === 'RESULT_PENDING') assert.equal(await page.locator('.hero-actions a[href="/resultado"]').count(), 0);
      await assertLayout(page);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});

test('countdown uses the server clock and confirms state with the API at zero', async () => {
  const { context, page, state, errors } = await fixture({ serverTime: '2026-10-15T20:00:00Z', votingStartsAt: '2026-10-15T20:00:03Z' });
  try {
    await page.clock.install({ time: new Date('2036-01-01T00:00:00Z') });
    await ready(page);
    const timer = page.getByRole('timer', { name: 'A votação abre em', exact: true });
    assert.equal(await timer.locator('dd').nth(0).innerText(), '00');
    assert.ok(['02', '03'].includes(await timer.locator('dd').nth(3).innerText()));
    state.settings = { ...state.settings, votingState: 'OPEN' };
    await page.clock.fastForward(4000);
    await page.locator('.hero-primary').filter({ hasText: 'Votar agora' }).waitFor();
    assert.equal(state.settingsCalls, 2);
    state.settings = { ...state.settings, votingState: 'CLOSED' };
    await page.clock.fastForward(31000);
    await page.locator('.hero-event-details .event-status').filter({ hasText: 'Votação encerrada' }).waitFor();
    assert.equal(await page.locator('.hero-primary').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('an elapsed countdown cannot open voting while the server remains WAITING', async () => {
  const { context, page, state } = await fixture({ votingStartsAt: '2026-10-15T19:59:00Z' });
  try {
    await ready(page);
    await page.waitForFunction(() => globalThis.document.querySelector('.countdown-label')?.textContent.includes('Aguardando'));
    assert.equal(await page.locator('.hero-actions a[href="/votar"]').count(), 0);
    assert.ok(state.settingsCalls <= 2);
  } finally { await context.close(); }
});

test('registration, upload, participant listing, voting and admin routes still open', async () => {
  const { context, page, state, errors } = await fixture();
  try {
    await ready(page);
    await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).click();
    await page.getByLabel('Nome do participante ou grupo').fill('Participante de teste local');
    await page.getByLabel('Nome da fantasia').fill('Fantasia de teste local');
    const image = await readFile(path.join(frontend, 'public/assets/halloween-invitation-background.webp'));
    await page.locator('input[type="file"]').setInputFiles({ name: 'foto-teste.webp', mimeType: 'image/webp', buffer: Buffer.from(image) });
    await page.getByRole('button', { name: 'Cadastrar fantasia', exact: true }).click();
    await page.getByText('Cadastro realizado!', { exact: true }).waitFor();
    assert.equal(state.submissions.length, 1);
    assert.ok(state.submissions[0].includes('name="photo"'));
    assert.ok(state.submissions[0].includes('Fantasia de teste local'));
    for (const route of ['/participantes', '/votar', '/ranking', '/resultados', '/resultado', '/admin']) {
      await page.goto(origin + route);
      await page.waitForLoadState('networkidle');
      assert.equal(new globalThis.URL(page.url()).pathname, route);
      assert.ok(await page.locator('h1, main, form').count() > 0);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('API failure keeps navigation available and offers a working retry', async () => {
  const { context, page, state } = await fixture();
  try {
    state.failSettings = true;
    await page.goto(origin);
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.hero-primary').count(), 0);
    assert.equal(await page.locator('.hero-secondary').isVisible(), true);
    state.failSettings = false;
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).waitFor();
  } finally { await context.close(); }
});

test('reduced motion, lightweight devices and hidden tabs stop atmospheric animation', async () => {
  const { context, page } = await fixture({}, { reducedMotion: 'reduce' });
  try {
    await ready(page);
    assert.equal(await page.locator('.fog-near').evaluate((element) => globalThis.getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.scene-particles').isVisible(), false);
    assert.equal(await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).isVisible(), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      Object.defineProperty(globalThis.document, 'hidden', { configurable: true, value: true });
      globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    });
    assert.equal(await page.locator('.cinematic-scene').getAttribute('data-paused'), 'true');
    assert.equal(await page.locator('.fog-near').evaluate((element) => globalThis.getComputedStyle(element).animationPlayState), 'paused');
    await page.addInitScript(() => Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 2 }));
    await page.reload();
    await page.locator('.cinematic-scene[data-lite="true"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.scene-particles').isVisible(), false);
    assert.equal(await page.locator('.fog-near').evaluate((element) => globalThis.getComputedStyle(element).animationName), 'none');
  } finally { await context.close(); }
});

test('desktop and mobile pass automated WCAG A/AA accessibility checks', async () => {
  const { context, page } = await fixture({}, { reducedMotion: 'reduce' });
  try {
    await ready(page);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      assert.deepEqual(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })), []);
    }
  } finally { await context.close(); }
});

test('voting link copy provides success and accessible fallback feedback', async () => {
  const { context, page } = await fixture({ votingState: 'OPEN' });
  try {
    await page.addInitScript(() => Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true, value: { writeText: async (value) => { globalThis.copiedVotingUrl = value; } },
    }));
    await page.goto(origin);
    await page.getByRole('button', { name: 'Copiar link' }).click();
    await page.getByRole('button', { name: 'Link copiado' }).waitFor();
    assert.equal(await page.evaluate(() => globalThis.copiedVotingUrl), await page.locator('#voting-url').inputValue());
    await page.evaluate(() => Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true, value: { writeText: async () => { throw new Error('Clipboard unavailable'); } },
    }));
    await page.getByRole('button', { name: 'Link copiado' }).click();
    await page.getByText('Selecione o link para copiar manualmente.').waitFor();
  } finally { await context.close(); }
});

test('local initial rendering records LCP and avoids significant layout shift', async () => {
  const { context, page } = await fixture();
  try {
    await page.addInitScript(() => {
      globalThis.cinematicMetrics = { lcp: 0, cls: 0 };
      new globalThis.PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) globalThis.cinematicMetrics.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new globalThis.PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) if (!entry.hadRecentInput) globalThis.cinematicMetrics.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await ready(page);
    await page.waitForFunction(() => globalThis.cinematicMetrics.lcp > 0);
    const metrics = await page.evaluate(() => ({
      ...globalThis.cinematicMetrics,
      photographRequests: globalThis.performance.getEntriesByType('resource')
        .filter((entry) => entry.name.includes('halloween-invitation-background'))
        .map((entry) => ({ url: entry.name, transferSize: entry.transferSize })),
    }));
    assert.ok(metrics.cls < 0.1, JSON.stringify(metrics));
    assert.equal(metrics.photographRequests.length, 1);
    console.log(`Local synthetic metrics (unthrottled, mocked API): ${JSON.stringify(metrics)}`);
  } finally { await context.close(); }
});

test('desktop camera interpolates across real depth planes while the interface stays fixed', async () => {
  const { context, page, errors } = await fixture();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 8 });
      Object.defineProperty(globalThis.navigator, 'deviceMemory', { value: 8 });
    });
    await ready(page);
    await page.locator('.cinematic-scene[data-quality="full"]').waitFor({ state: 'attached' });
    await page.locator('.hero-actions').evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
    const interfaceBefore = await page.locator('.hero-actions').boundingBox();
    await page.mouse.move(1390, 710);
    await page.waitForFunction(() => globalThis.document.querySelector('.cinematic-scene')?.dataset.cameraMoving === 'true');
    const earlyPosition = await page.locator('.cinematic-scene').evaluate((element) => Number(element.style.getPropertyValue('--camera-x')));
    await page.waitForFunction(() => {
      const scene = globalThis.document.querySelector('.cinematic-scene');
      return scene?.dataset.cameraMoving === 'false' && Number(scene.style.getPropertyValue('--camera-x')) > 0.9;
    });
    const spatial = await page.evaluate(() => {
      const scene = globalThis.document.querySelector('.cinematic-scene');
      const matrix = (selector) => new globalThis.DOMMatrixReadOnly(globalThis.getComputedStyle(scene.querySelector(selector)).transform);
      return {
        horizontal: Number(scene.style.getPropertyValue('--camera-x')),
        photographDepth: matrix('.scene-depth-photo').m43,
        hazeDepth: matrix('.scene-depth-haze').m43,
        foregroundDepth: matrix('.scene-depth-foreground').m43,
        photographTravel: matrix('.scene-depth-photo').m41,
        foregroundTravel: matrix('.scene-depth-foreground').m41,
        perspective: globalThis.getComputedStyle(scene.querySelector('.scene-lens')).perspective,
        pointerEvents: globalThis.getComputedStyle(scene).pointerEvents,
      };
    });
    assert.ok(earlyPosition < spatial.horizontal);
    assert.ok(spatial.horizontal <= 1);
    assert.ok(spatial.photographDepth < spatial.hazeDepth && spatial.hazeDepth < spatial.foregroundDepth);
    assert.ok(Math.abs(spatial.foregroundTravel) > Math.abs(spatial.photographTravel) * 3);
    assert.equal(spatial.perspective, '1200px');
    assert.equal(spatial.pointerEvents, 'none');
    assert.equal(await page.locator('.cinematic-scene img').count(), 1);
    assert.equal(await page.locator('.scene-ember').count(), 10);
    assert.equal(await page.locator('.scene-fog').count(), 3);
    assert.deepEqual(await page.locator('.hero-actions').boundingBox(), interfaceBefore);
    const changesWhileIdle = await page.locator('.cinematic-scene').evaluate((element) => new Promise((resolve) => {
      let mutations = 0;
      let frames = 0;
      const observer = new globalThis.MutationObserver((entries) => { mutations += entries.length; });
      observer.observe(element, { attributes: true, attributeFilter: ['style'] });
      const observeFrame = () => {
        frames += 1;
        if (frames < 12) return globalThis.requestAnimationFrame(observeFrame);
        observer.disconnect();
        resolve(mutations);
      };
      globalThis.requestAnimationFrame(observeFrame);
    }));
    assert.equal(changesWhileIdle, 0);
    await page.screenshot({ path: path.join(output, 'scene-depth-desktop.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).click();
    await page.waitForURL(`${origin}/cadastro`);
    await page.locator('.scene-interior[data-quality="static"]').waitFor({ state: 'attached' });
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('camera stops offscreen and respects reduced motion changes immediately', async () => {
  const { context, page } = await fixture();
  try {
    await page.addInitScript(() => Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 8 }));
    await ready(page);
    await page.locator('.cinematic-scene[data-quality="full"]').waitFor({ state: 'attached' });
    await page.mouse.move(1200, 600);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.cinematic-scene[data-quality="static"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.scene-camera-rig').evaluate((element) => globalThis.getComputedStyle(element).transform), 'none');
    assert.equal(await page.locator('.scene-camera-float').evaluate((element) => globalThis.getComputedStyle(element).animationName), 'none');
    assert.equal(await page.locator('.cinematic-scene').getAttribute('data-camera-moving'), 'false');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.cinematic-scene[data-quality="full"]').waitFor({ state: 'attached' });
    await page.evaluate(() => {
      globalThis.document.querySelector('.public-shell').style.minHeight = '2600px';
      globalThis.scrollTo(0, 1600);
    });
    await page.locator('.cinematic-scene[data-paused="true"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.fog-near').evaluate((element) => globalThis.getComputedStyle(element).animationPlayState), 'paused');
    assert.equal(await page.locator('.cinematic-scene').getAttribute('data-camera-moving'), 'false');
    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.locator('.cinematic-scene[data-paused="false"]').waitFor({ state: 'attached' });
  } finally { await context.close(); }
});

test('mobile and lack of CSS 3D use a stable photograph with limited atmosphere', async () => {
  for (const variant of ['mobile', 'no-3d']) {
    const { context, page, errors } = await fixture({}, { viewport: { width: variant === 'mobile' ? 390 : 1440, height: 844 } });
    try {
      await page.addInitScript((disableDepth) => {
        Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 8 });
        Object.defineProperty(globalThis.navigator, 'deviceMemory', { value: 8 });
        if (disableDepth) {
          const originalSupports = globalThis.CSS.supports.bind(globalThis.CSS);
          globalThis.CSS.supports = (...argumentsList) => argumentsList[0] === 'transform-style' ? false : originalSupports(...argumentsList);
        }
      }, variant === 'no-3d');
      await ready(page);
      await page.locator('.cinematic-scene[data-quality="ambient"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('.scene-camera-rig').evaluate((element) => globalThis.getComputedStyle(element).transform), 'none');
      assert.equal(await page.locator('.scene-motes-near').isVisible(), false);
      assert.equal(await page.locator('.scene-motes-far').isVisible(), false);
      assert.equal(await page.locator('.fog-far').isVisible(), false);
      assert.equal(await page.locator('.fog-near').isVisible(), true);
      assert.equal(await page.locator('.cinematic-scene canvas').count(), 0);
      await assertLayout(page);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});

test('photographic pixels have different depth while both masks translate rigidly', async () => {
  const { context, page, errors } = await fixture({}, { viewport: { width: 1672, height: 941 } });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 8 });
      Object.defineProperty(globalThis.navigator, 'deviceMemory', { value: 8 });
    });
    await ready(page);
    await page.locator('[data-depth-state="ready"]').waitFor({ state: 'attached' });
    await page.screenshot({ path: path.join(output, 'photo-depth-integrated.png'), animations: 'disabled' });
    await page.addStyleTag({ content: `
      .cinematic-scene { height: 941px !important; }
      .scene-lens { inset: 0 !important; }
      .scene-camera-float, .scene-camera-rig, .scene-depth-plane { transform: none !important; animation: none !important; }
      .scene-picture, .scene-photo-depth { filter: none !important; transform: none !important; }
      .scene-atmosphere, .scene-shade, header, main, footer, .skip-link { opacity: 0 !important; }
    ` });
    const frames = [];
    for (const [name, position] of [['left', 8], ['right', 1664]]) {
      await page.mouse.move(position, 470.5);
      await page.waitForFunction((target) => {
        const scene = globalThis.document.querySelector('.cinematic-scene');
        return scene?.dataset.cameraMoving === 'false' && Number(scene.style.getPropertyValue('--camera-x')) === target;
      }, Number((position / 1672 * 2 - 1).toFixed(5)));
      const screenshot = await page.locator('.scene-photo-depth').screenshot({ path: path.join(output, `photo-depth-${name}.png`) });
      frames.push(await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
    }
    assert.equal(frames[0].info.width, 1672);
    assert.equal(frames[0].info.height, 941);
    function displacement(horizontal, vertical, width = 32, height = 32) {
      let best = { shift: 0, error: Infinity };
      for (let shift = -40; shift <= 40; shift += 1) {
        let error = 0;
        for (let row = 0; row < height; row += 2) {
          for (let column = 0; column < width; column += 2) {
            const first = ((vertical + row) * 1672 + horizontal + column) * 3;
            const second = ((vertical + row) * 1672 + horizontal + column + shift) * 3;
            for (let channel = 0; channel < 3; channel += 1) error += Math.abs(frames[0].data[first + channel] - frames[1].data[second + channel]);
          }
        }
        if (error < best.error) best = { shift, error };
      }
      return { shift: best.shift, meanError: best.error / (Math.ceil(width / 2) * Math.ceil(height / 2) * 3) };
    }
    const depths = {
      sky: displacement(1000, 100), trees: displacement(900, 450), ground: displacement(1100, 850),
      firstMask: displacement(340, 403, 30, 45), secondMask: displacement(535, 419, 30, 32),
      firstCostume: displacement(315, 540), secondCostume: displacement(520, 675),
    };
    assert.ok(Math.abs(depths.sky.shift - depths.firstMask.shift) > 12, JSON.stringify(depths));
    assert.ok(Math.abs(depths.ground.shift - depths.trees.shift) > 12, JSON.stringify(depths));
    for (const region of ['firstMask', 'secondMask', 'firstCostume', 'secondCostume']) {
      assert.ok(Math.abs(depths[region].shift - depths.firstMask.shift) <= 1, JSON.stringify(depths));
      assert.ok(depths[region].meanError < 8, JSON.stringify(depths));
    }
    console.log(`Measured photographic pixel displacement (left/right camera): ${JSON.stringify(depths)}`);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('WebGL failure and context loss reveal the original photo without blocking navigation', async () => {
  for (const unavailable of [true, false]) {
    const { context, page, errors } = await fixture();
    try {
      await page.addInitScript((disableWebGL) => {
        Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', { value: 8 });
        Object.defineProperty(globalThis.navigator, 'deviceMemory', { value: 8 });
        globalThis.depthDraws = 0;
        globalThis.depthAttempts = 0;
        const getContext = globalThis.HTMLCanvasElement.prototype.getContext;
        globalThis.HTMLCanvasElement.prototype.getContext = function (kind, options) {
          if (kind === 'webgl') {
            globalThis.depthAttempts += 1;
            if (disableWebGL) return null;
          }
          return getContext.call(this, kind, options);
        };
        const drawArrays = globalThis.WebGLRenderingContext.prototype.drawArrays;
        globalThis.WebGLRenderingContext.prototype.drawArrays = function (...argumentsList) {
          if (this.canvas.classList.contains('scene-photo-depth')) globalThis.depthDraws += 1;
          return drawArrays.apply(this, argumentsList);
        };
      }, unavailable);
      await ready(page);
      await page.waitForFunction(() => globalThis.depthAttempts > 0);
      if (!unavailable) {
        await page.locator('[data-depth-state="ready"]').waitFor({ state: 'attached' });
        await page.mouse.move(1300, 500);
        await page.waitForFunction(() => globalThis.document.querySelector('.cinematic-scene')?.dataset.cameraMoving === 'false');
        const draws = await page.evaluate(() => globalThis.depthDraws);
        await page.evaluate(() => new Promise((resolve) => {
          let frames = 0;
          const next = () => { if (++frames === 20) resolve(); else globalThis.requestAnimationFrame(next); };
          globalThis.requestAnimationFrame(next);
        }));
        assert.equal(await page.evaluate(() => globalThis.depthDraws), draws);
        await page.locator('.scene-photo-depth').evaluate((canvas) => {
          globalThis.depthContextControl = canvas.getContext('webgl').getExtension('WEBGL_lose_context');
          globalThis.depthContextControl.loseContext();
        });
      }
      await page.locator('[data-depth-state="fallback"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('.scene-photo-depth').isVisible(), false);
      assert.equal(await page.locator('.scene-photo').isVisible(), true);
      if (!unavailable) {
        await page.evaluate(() => globalThis.depthContextControl.restoreContext());
        await page.locator('[data-depth-state="ready"]').waitFor({ state: 'attached' });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => !globalThis.document.querySelector('.scene-photo-depth'));
      }
      await page.getByRole('link', { name: 'Cadastrar minha fantasia' }).click();
      await page.waitForURL(`${origin}/cadastro`);
      assert.equal(await page.locator('.scene-photo-depth').count(), 0);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});
