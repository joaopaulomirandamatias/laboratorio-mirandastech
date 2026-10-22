import { STAGES, simulate } from './model.mjs';
import { createScene } from './scene.js';
import { createIllustratedScene } from './motion.js';

const $ = id => document.getElementById(id);
const experience = document.querySelector('.experience');
const stage = document.querySelector('.stage');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let currentStep = -1, progress = 0, sceneApi = null, isFlat = true, paused = media.matches;
let state = { context: true, action: 'read', allowSend: false };
let result = simulate(state);
const illustration = createIllustratedScene($('machine-plate'), $('scene-wrap'), { reducedMotion:media.matches });
const openingFilm = $('opening-film');
let openingVisible = true, openingPending = false, openingBlocked = false;
openingFilm.muted = true;

// The same clip plays in the opening; chapter navigation hands off to the layers.
function syncOpeningFilm() {
  const opening = currentStep < 0 && isFlat && !$('film-dialog').open;
  const shouldPlay = opening && !paused && openingVisible && !document.hidden && !openingBlocked;
  if (!shouldPlay) {
    openingFilm.pause();
    $('machine-plate').dataset.film = opening && openingFilm.readyState >= 2 && !openingBlocked ? 'paused' : 'hidden';
  } else if (!openingFilm.paused && openingFilm.readyState >= 2) {
    $('machine-plate').dataset.film = 'playing';
  } else if (!openingPending) {
    openingPending = true;
    openingFilm.play().then(() => { openingPending = false; syncOpeningFilm(); }).catch(error => {
      openingPending = false;
      // A quick chapter change aborts loading; autoplay rejection keeps the layers.
      if (error.name !== 'AbortError') openingBlocked = true;
      syncOpeningFilm();
    });
  }
  const filmVisible = ['playing','paused'].includes($('machine-plate').dataset.film);
  illustration.setVisible(isFlat && !$('film-dialog').open && !filmVisible);
}
openingFilm.addEventListener('playing', syncOpeningFilm);
openingFilm.addEventListener('error', () => { openingBlocked = true; syncOpeningFilm(); });
const openingObserver = new IntersectionObserver(entries => { openingVisible = entries[0].isIntersecting; syncOpeningFilm(); });
openingObserver.observe($('scene-wrap'));
document.addEventListener('visibilitychange', syncOpeningFilm);

function make(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function renderSimulation() {
  result = simulate(state);
  $('use-context').checked = $('result-context').checked = state.context;
  $('allow-send').checked = $('result-permission').checked = state.allowSend;
  $('result-action').value = state.action;
  document.querySelectorAll('input[name=action]').forEach(input => { input.checked = input.value === state.action; });
  $('context-note').textContent = state.context ? 'Duas fichas didáticas disponíveis.' : 'Sem documentos: a resposta não terá fontes consultadas.';
  $('answer-text').textContent = $('mini-answer').textContent = result.answer;
  for (const node of [$('live-outcome'), $('result-outcome')]) {
    node.textContent = result.outcome; node.dataset.status = result.status;
  }
  $('sources').replaceChildren();
  if (!result.sources.length) $('sources').append(make('p', 'Sem fontes consultadas neste modo.'));
  for (const source of result.sources) {
    const details = make('details'); details.append(make('summary', `[${source.id}] ${source.title}`), make('p', source.text));
    $('sources').append(details);
  }
  $('audit-log').replaceChildren(...result.log.map(entry => {
    const li = make('li'); li.dataset.status = entry.status;
    li.append(make('strong', entry.stage), make('span', entry.detail)); return li;
  }));
  $('poster-status').textContent = result.status === 'blocked' ? '×' : '✓';
  $('poster-status').dataset.status = result.status;
  illustration.update(currentStep, progress, result);
  sceneApi?.update(currentStep, progress, result);
}
function renderStep(index) {
  currentStep = index;
  stage.classList.toggle('is-step', index >= 0);
  $('scene-toolbar').hidden = false;
  $('overview').hidden = index < 0;
  $('machine-plate').dataset.active = String(index);
  $('hero-copy').hidden = index >= 0; $('step-copy').hidden = index < 0;
  if (index >= 0) {
    const step = STAGES[index];
    $('step-tag').textContent = step.tag; $('step-title').textContent = step.title;
    $('step-body').textContent = step.body; $('step-insight').textContent = step.insight;
    $('step-count').textContent = `0${index + 1} / 06`;
  }
  $('context-control').hidden = index !== 1;
  $('tools-control').hidden = index !== 3;
  $('permission-control').hidden = index !== 4;
  $('live-outcome').hidden = index !== 3 && index !== 4;
  $('step-result').hidden = index !== 5;
  $('previous-step').disabled = index < 0;
  $('next-step').setAttribute('aria-label', index === 5 ? 'Ver resposta completa' : 'Próxima etapa');
  document.querySelectorAll('[data-step], [data-layer]').forEach(node => {
    const value = Number(node.dataset.step ?? node.dataset.layer);
    if (value === index) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
    node.dataset.complete = String(value < index);
  });
  syncOpeningFilm();
}
function metrics() {
  const top = experience.getBoundingClientRect().top + window.scrollY;
  return { start: top, range: Math.max(1, experience.offsetHeight - stage.offsetHeight) };
}
function goTo(index, smooth = true) {
  const { start, range } = metrics();
  const target = index < 0 ? start : start + ((index + 1.35) / 7) * range;
  history.replaceState(null, '', index < 0 ? location.pathname : `#etapa-${STAGES[index].id}`);
  window.scrollTo({ top: Math.max(0, target), behavior: smooth && !media.matches ? 'smooth' : 'instant' });
}
function onScroll() {
  const { start, range } = metrics();
  progress = Math.max(0, Math.min(1, (window.scrollY - start) / range));
  const index = Math.min(5, Math.floor(progress * 7 + .001) - 1);
  if (index !== currentStep) renderStep(index);
  $('story-progress').style.width = `${progress * 100}%`;

  illustration.update(currentStep, progress, result);
  sceneApi?.update(currentStep, progress, result);
}
let scrollFrame = 0;
const scheduleScroll = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; onScroll(); });
};
function flatView(value) {
  isFlat = value;
  $('canvas-host').hidden = value; $('scene-labels').hidden = value;
  $('scene-fallback').hidden = !value;
  $('flat-view').setAttribute('aria-pressed', String(value));
  $('flat-view').textContent = value ? 'Modelo 3D' : 'Cena animada';
  $('pause-motion').hidden = false;
  illustration.setVisible(value);
  $('renderer-label').textContent = value ? 'Cena animada · selecione uma camada' : 'Arraste na horizontal para girar';
  sceneApi?.setFlat(value);
  syncOpeningFilm();
}
function open3D() {
  if (!isFlat) { flatView(true); return; }
  if (!sceneApi) {
    try { sceneApi = createScene($('canvas-host'), $('scene-labels'), { onSelect: goTo, reducedMotion: media.matches, onFailure: unavailable3D }); }
    catch { sceneApi = null; }
  }
  if (!sceneApi) { unavailable3D(); return; }
  flatView(false);
  sceneApi.setMotion(!paused);
  sceneApi.update(currentStep, progress, result);
}
function unavailable3D() {
  flatView(true);
  $('flat-view').hidden = true;
  $('renderer-label').textContent = 'Cena animada · aula completa disponível';
}

// Input handlers only update simulation state; they never submit or call a service.
for (const id of ['use-context', 'result-context']) $(id).addEventListener('change', e => { state.context = e.target.checked; renderSimulation(); });
for (const id of ['allow-send', 'result-permission']) $(id).addEventListener('change', e => { state.allowSend = e.target.checked; renderSimulation(); });
document.querySelectorAll('input[name=action]').forEach(input => input.addEventListener('change', e => { state.action = e.target.value; renderSimulation(); }));
$('result-action').addEventListener('change', e => { state.action = e.target.value; renderSimulation(); });
$('try-send').addEventListener('click', () => { state.action = 'send'; renderSimulation(); });
$('reset').addEventListener('click', () => { state = { context: true, action: 'read', allowSend: false }; renderSimulation(); });
document.querySelectorAll('[data-step], [data-layer], [data-start]').forEach(link => link.addEventListener('click', e => {
  e.preventDefault(); goTo(Number(link.dataset.step ?? link.dataset.layer ?? 0));
}));
document.querySelector('.step-nav').addEventListener('keydown', e => {
  const links = [...document.querySelectorAll('.step-nav [data-step]')];
  const index = links.indexOf(document.activeElement);
  if (index < 0) return;
  const target = e.key === 'ArrowRight' ? (index + 1) % 6 : e.key === 'ArrowLeft' ? (index + 5) % 6 : e.key === 'Home' ? 0 : e.key === 'End' ? 5 : null;
  if (target !== null) { e.preventDefault(); links[target].focus({ preventScroll: true }); goTo(target); }
});
$('previous-step').addEventListener('click', () => goTo(currentStep - 1));
$('next-step').addEventListener('click', () => {
  if (currentStep < 5) goTo(currentStep + 1);
  else $('resultado').scrollIntoView({ behavior: media.matches ? 'instant' : 'smooth' });
});
$('overview').addEventListener('click', () => goTo(-1));
$('pause-motion').addEventListener('click', () => {
  paused = !paused; sceneApi?.setMotion(!paused); illustration.setMotion(!paused);
  $('pause-motion').setAttribute('aria-pressed', String(paused));
  $('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
  if (!paused) openingBlocked = false;
  syncOpeningFilm();
});
$('flat-view').addEventListener('click', open3D);
media.addEventListener('change', () => {
  paused = media.matches; sceneApi?.setReduced(media.matches); illustration.setReduced(media.matches);
  $('pause-motion').setAttribute('aria-pressed', String(paused));
  $('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
  syncOpeningFilm();
});
flatView(true);
$('scene-toolbar').hidden = false; $('simulation-ui').hidden = false;
document.body.classList.add('lesson-ready');
$('pause-motion').setAttribute('aria-pressed', String(paused));
$('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
renderSimulation(); renderStep(-1); onScroll();
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll, { passive: true });
window.addEventListener('pagehide', e => { if (!e.persisted) { openingFilm.pause(); openingObserver.disconnect(); document.removeEventListener('visibilitychange',syncOpeningFilm); sceneApi?.dispose(); illustration.dispose(); } });
window.addEventListener('hashchange', () => {
  const index = STAGES.findIndex(s => location.hash === `#etapa-${s.id}`);
  if (index >= 0) goTo(index, false);
});
const initialIndex = STAGES.findIndex(s => location.hash === `#etapa-${s.id}`);
if (initialIndex >= 0) requestAnimationFrame(() => goTo(initialIndex, false));

// The enlarged view reuses the clip while the inline player is paused.
$('watch-film').addEventListener('click', () => {
  $('film-dialog').showModal();
  syncOpeningFilm(); sceneApi?.setFlat(true);
  $('hero-film').play().catch(() => {});
});
$('close-film').addEventListener('click', () => $('film-dialog').close());
$('film-dialog').addEventListener('close', () => {
  $('hero-film').pause(); sceneApi?.setFlat(isFlat); syncOpeningFilm();
});
