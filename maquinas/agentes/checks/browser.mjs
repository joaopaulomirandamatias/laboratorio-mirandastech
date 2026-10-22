// npm i --no-save playwright ; CHROME_PATH=/path/to/chrome node maquinas/agentes/checks/browser.mjs
import assert from 'node:assert/strict';
import { mkdirSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.CHECK_OUTPUT || '/tmp/mirandastech-agentes-checks';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const root = fileURLToPath(new URL('../../../site/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css', '.svg':'image/svg+xml', '.ttf':'font/ttf' };
let server;
let base = process.env.BASE_URL;
if (!base) {
  server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try { const stat = statSync(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': stat.size }); createReadStream(file).pipe(res); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
}
const path = `${base}/maquinas/agentes/`;
const errors = [];
const externalRequests = [];
const page = await browser.newPage({ viewport: { width: 1586, height: 992 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(10000);
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url()); });
const step = async (index, target = page) => {
  await target.locator(`.step-nav [data-step="${index}"]`).click();
  await target.waitForFunction(i => document.querySelector(`.step-nav [data-step="${i}"]`).getAttribute('aria-current') === 'step', index);
};
try {
  await page.goto(path);
  await page.locator('#simulation-ui').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('#canvas-host canvas').count(), 0);
  assert.equal(await page.locator('#scene-fallback').isVisible(), true);
  assert.equal(await page.locator('.machine-art').evaluate(img => img.complete && img.naturalWidth === 1024), true);
  await page.screenshot({ path: `${output}/desktop.png` });
  assert.equal(await page.locator('.step-nav [data-step]').count(), 6);
  assert.equal(await page.locator('#pause-motion').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('header.topbar').count(), 1);
  assert.equal(await page.locator('footer.mt-foot').count(), 1);
  await step(0);
  await page.locator('#flat-view').click();
  assert.equal(await page.locator('#canvas-host canvas').count(), 1);
  assert.equal(await page.locator('#canvas-host').isVisible(), true);
  await page.screenshot({ path: `${output}/live-3d.png` });
  await page.locator('#flat-view').click();
  assert.equal(await page.locator('#scene-fallback').isVisible(), true);
  await step(1); await page.locator('#use-context').uncheck();
  assert.match(await page.locator('#sources').textContent(), /Sem fontes/);
  assert.equal(await page.locator('#result-context').isChecked(), false);
  await step(3); await page.locator('input[name=action][value=send]').check();
  await step(4);
  assert.match(await page.locator('#live-outcome').textContent(), /bloqueado/i);
  await page.locator('#allow-send').check();
  assert.match(await page.locator('#live-outcome').textContent(), /autorizado/i);
  await page.screenshot({ path: `${output}/permission.png` });
  await step(5); await page.locator('#step-result a').click();
  await page.locator('#reset').click();
  assert.equal(await page.locator('#sources details').count(), 2);
  assert.match(await page.locator('#answer-text').textContent(), /\[1\]/);
  assert.equal(await page.locator('#audit-log li').count(), 6);
  await page.screenshot({ path: `${output}/result.png` });
  await page.locator('#result-action').selectOption('send');
  assert.match(await page.locator('#result-outcome').textContent(), /bloqueado/i);
  await page.locator('#result-permission').check();
  assert.match(await page.locator('#result-outcome').textContent(), /autorizado/i);
  await page.locator('.step-nav [data-step="0"]').focus();
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.activeElement.dataset.step === '5');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.activeElement.dataset.step === '0');
  assert.equal(await page.locator('#scene-fallback').isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', e => errors.push(e.message));
  await mobile.goto(path); await mobile.locator('#simulation-ui').waitFor({ state: 'visible' });
  await mobile.screenshot({ path: `${output}/mobile.png` });
  for (const i of [0, 1, 2, 3, 4, 5]) await step(i, mobile);
  await mobile.screenshot({ path: `${output}/mobile-step.png` });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Short viewport: controls stay in view even with browser toolbars consuming height.
  await mobile.setViewportSize({ width: 375, height: 667 });
  await step(4, mobile);
  await mobile.locator('#try-send').click();
  await mobile.locator('#allow-send').check();
  assert.match(await mobile.locator('#live-outcome').textContent(), /autorizado/i);
  assert.equal(await mobile.locator('.step-nav').evaluate(node => node.getBoundingClientRect().bottom <= innerHeight), true);
  await mobile.screenshot({ path: `${output}/mobile-short.png` });
  const animated = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  animated.on('pageerror', e => errors.push(e.message));
  await animated.goto(path); await animated.locator('#simulation-ui').waitFor({ state: 'visible' });
  assert.equal(await animated.locator('#pause-motion').getAttribute('aria-pressed'), 'false');
  await step(0, animated);
  await animated.locator('#flat-view').click();
  await animated.locator('#pause-motion').click();
  assert.equal(await animated.locator('#pause-motion').getAttribute('aria-pressed'), 'true');
  await step(3, animated);
  // Native scrolling can select a chapter without clicking the timeline.
  await animated.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); });
  await animated.locator('#hero-copy').waitFor({ state: 'visible' });
  const noGl = await browser.newPage({ viewport: { width: 1100, height: 850 }, reducedMotion: 'reduce' });
  await noGl.route('**/three-r128.min.js', route => route.abort());
  await noGl.goto(path); await noGl.locator('#simulation-ui').waitFor({ state: 'visible' });
  assert.equal(await noGl.locator('#scene-fallback').isVisible(), true);
  await step(4, noGl);
  await noGl.locator('#flat-view').click();
  assert.equal(await noGl.locator('#flat-view').isVisible(), false);
  assert.equal(await noGl.locator('#scene-fallback').isVisible(), true);
  await noGl.locator('#try-send').click();
  assert.match(await noGl.locator('#live-outcome').textContent(), /bloqueado/i);
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noJs.goto(path);
  assert.equal(await noJs.locator('.reading-grid article').count(), 6);
  assert.equal(await noJs.locator('#hero-copy').isVisible(), true);
  assert.equal(await noJs.locator('#scene-fallback').isVisible(), true);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(errors, []);
  console.log('ok: desktop, seis etapas, contexto, envio bloqueado/autorizado, registro, teclado, 2D, celular, sem WebGL e sem JS.');
  console.log(`Capturas: ${output}`);
} catch (error) { await page.screenshot({ path: `${output}/failure.png` }); throw error; }
finally { await browser.close(); if (server) await new Promise(ok => server.close(ok)); }
