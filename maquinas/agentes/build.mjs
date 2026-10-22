import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { withCampusShell } from '../prisma/shell.mjs';
import { STAGES } from './model.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
let html = read('./index.template.html');
html = html.replace('/* PAGE_CSS */', read('./page.css'))
  .replace('<!-- STEP_NAV -->', STAGES.map((s, i) => `<li><a href="#etapa-${s.id}" data-step="${i}"><span class="step-dot"></span><b>0${i + 1}</b><span>${s.name}</span></a></li>`).join(''))
  .replace('<!-- FALLBACK -->', [...STAGES].reverse().map((s, reverse) => `<li><a href="#etapa-${s.id}" data-step="${5 - reverse}"><b>0${6 - reverse}</b>${s.name}<span>↗</span></a></li>`).join(''))
  .replace('<!-- SCENE_LABELS -->', STAGES.map((s, i) => `<button type="button" class="scene-label" data-layer="${i}">${s.name === 'Contexto' ? 'Documentos' : s.name}</button>`).join(''))
  .replace('<!-- ANCHORS -->', STAGES.map(s => `<div id="etapa-${s.id}"></div>`).join(''))
  .replace('<!-- READING -->', STAGES.map((s, i) => `<article><span class="panel-label">0${i + 1} / ${s.name.toUpperCase()}</span><h3>${escape(s.title)}</h3><p>${escape(s.body)}</p><p class="reading-insight">${escape(s.insight)}</p></article>`).join(''));
const js = ['./model.mjs', './scene.js', './app.js'].map(path => read(path)
  .replace(/^import .*;\s*$/gm, '')
  .replace(/^export /gm, '')).join('\n');
if (/<\/script/i.test(js)) throw new Error('Script de origem contém fechamento HTML inesperado.');
html = html.replace('/* LESSON_JS */', () => js);
html = withCampusShell(html, read('../../site/index.html'));
const output = new URL('../../site/maquinas/agentes/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('index.html', output), '<!-- GERADO: node maquinas/agentes/build.mjs -->\n' + html);
const fonts = new URL('../../site/assets/fonts/', import.meta.url);
mkdirSync(fonts, { recursive: true });
for (const font of ['Geist_normal.woff2', 'GeistMono_normal.woff2', 'InstrumentSerif_italic.woff2']) {
  copyFileSync(new URL('../prisma/fonts/' + font, import.meta.url), new URL(font, fonts));
}
console.log(`Máquina de IA gerada: ${Math.round(html.length / 1024)} KB.`);
