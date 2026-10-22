import { STAGES, simulate } from './model.mjs';
import { createScene } from './scene.js';

const $ = id => document.getElementById(id);
const experience = document.querySelector('.experience');
const stage = document.querySelector('.stage');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let currentStep = -1, progress = 0, sceneApi = null, isFlat = false, paused = media.matches;
let state = { context: true, action: 'read', allowSend: false };
let result = simulate(state);

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
  sceneApi?.update(currentStep, progress, result);
}
function renderStep(index) {
  currentStep = index;
  stage.classList.toggle('is-step', index >= 0);
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
}
function metrics() {
  const top = experience.getBoundingClientRect().top + window.scrollY;
  const header = document.querySelector('.campus-header')?.getBoundingClientRect().height || 65;
  return { start: top - header, range: Math.max(1, experience.offsetHeight - stage.offsetHeight) };
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
  sceneApi?.update(currentStep, progress, result);
}
let scrollFrame = 0;
const scheduleScroll = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; onScroll(); });
};
function flatView(value, failed = false) {
  isFlat = value;
  $('canvas-host').hidden = value; $('scene-labels').hidden = value;
  $('scene-fallback').hidden = !value;
  $('flat-view').setAttribute('aria-pressed', String(value));
  $('flat-view').textContent = value ? 'Visão 3D' : 'Visão 2D';
  $('renderer-label').textContent = value ? 'Visão das seis camadas' : 'Arraste na horizontal para girar';
  if (failed) {
    $('flat-view').hidden = true; $('pause-motion').hidden = true;
    $('renderer-label').textContent = 'Visão 2D · aula completa disponível';
  }
  sceneApi?.setFlat(value);
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
  paused = !paused; sceneApi?.setMotion(!paused);
  $('pause-motion').setAttribute('aria-pressed', String(paused));
  $('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
});
$('flat-view').addEventListener('click', () => flatView(!isFlat));
media.addEventListener('change', () => {
  paused = media.matches; sceneApi?.setReduced(media.matches);
  $('pause-motion').setAttribute('aria-pressed', String(paused));
  $('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
});
try {
  sceneApi = createScene($('canvas-host'), $('scene-labels'), { onSelect: goTo, reducedMotion: media.matches, onFailure: () => flatView(true, true) });
} catch (error) {
  console.warn('Visão 3D indisponível; a aula continua em 2D.', error.message);
}
flatView(!sceneApi, !sceneApi);
$('scene-toolbar').hidden = false; $('simulation-ui').hidden = false;
document.body.classList.add('lesson-ready');
$('pause-motion').setAttribute('aria-pressed', String(paused));
$('pause-motion').textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
renderSimulation(); renderStep(-1); onScroll();
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll, { passive: true });
window.addEventListener('pagehide', e => { if (!e.persisted) sceneApi?.dispose(); });
window.addEventListener('hashchange', () => {
  const index = STAGES.findIndex(s => location.hash === `#etapa-${s.id}`);
  if (index >= 0) goTo(index, false);
});
const initialIndex = STAGES.findIndex(s => location.hash === `#etapa-${s.id}`);
if (initialIndex >= 0) requestAnimationFrame(() => goTo(initialIndex, false));
