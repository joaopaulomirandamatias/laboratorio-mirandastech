import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { withCampusShell } from '../prisma/shell.mjs';
import { STAGES } from './model.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
// These complementary masks separate the artwork into independently moving layers.
const cuts = [
  [[0,1285],[115,1210],[470,1312],[492,1355],[700,1370],[1024,1320]],
  [[0,1040],[248,1024],[375,1067],[405,1078],[440,1085],[500,1105],[746,1009],[1024,1090]],
  [[0,785],[350,775],[495,765],[637,812],[710,858],[1024,740]],
  [[0,560],[408,540],[800,625],[1024,540]],
  [[0,280],[500,260],[850,325],[1024,265]],
];
const polygon = points => 'polygon('+points.map(([x,y])=>`${(x/1024*100).toFixed(3)}% ${(y/1536*100).toFixed(3)}%`).join(',')+')';
const artwork = STAGES.map((_,i) => {
  const top = i < 5 ? cuts[i] : [[0,0],[1024,0]];
  const bottom = i > 0 ? [...cuts[i-1]].reverse() : [[1024,1536],[0,1536]];
  return `<div class="machine-layer" data-art-layer="${i}" style="--layer-clip:${polygon([...top,...bottom])}"><div class="layer-bob"><img class="layer-image" src="../../assets/agentes-machine.webp" alt="" width="1024" height="1536" ${i === 0 ? 'fetchpriority="high"' : ''}>${i === 4 ? '<span class="poster-status" id="poster-status" aria-hidden="true">✓</span>' : ''}</div></div>`;
}).join('');
const dots = (id,count,duration,color) => Array.from({length:count},(_,i)=>`<circle r="${i%4===0?4:2}" fill="${color}"><animateMotion dur="${duration}s" begin="-${(i/count*duration).toFixed(2)}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`).join('');
const effects = `<svg class="machine-effects" viewBox="0 0 1024 1536" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="motion-glow"><feGaussianBlur stdDeviation="4"/></filter><radialGradient id="core-aura"><stop stop-color="#ffbd73" stop-opacity=".9"/><stop offset="1" stop-color="#ffbd73" stop-opacity="0"/></radialGradient><path id="flow-main" d="M430 1370 C610 1300 160 1210 385 1130 S600 1055 450 935 S495 800 590 710 S610 540 550 425"/><path id="flow-allowed" d="M550 425 C640 415 730 365 730 290 S715 195 740 155"/><path id="flow-blocked" d="M550 425 C680 460 780 420 830 480 S990 500 980 550"/></defs>
  <ellipse class="energy-orbit" cx="530" cy="775" rx="650" ry="110" transform="rotate(-16 530 775)"/>
  <ellipse class="energy-orbit" cx="530" cy="790" rx="620" ry="155" transform="rotate(13 530 790)"/>
  <circle class="core-pulse" cx="450" cy="935" r="85" fill="url(#core-aura)"/>
  <g class="flow-main"><use href="#flow-main" class="flow-halo"/><use href="#flow-main" class="flow-wire"/>${dots('flow-main',28,5.6,'#9eeaff')}</g>
  <g class="flow-allowed"><use href="#flow-allowed" class="flow-halo"/><use href="#flow-allowed" class="flow-wire"/>${dots('flow-allowed',10,2.7,'#9bffdf')}</g>
  <g class="flow-blocked"><use href="#flow-blocked" class="flow-halo"/><use href="#flow-blocked" class="flow-wire"/>${dots('flow-blocked',10,2.7,'#ffad80')}</g>
  <ellipse class="active-ring" cx="0" cy="0" rx="175" ry="45"/>
</svg>`;
let html = read('./index.template.html');
html = html.replace('/* PAGE_CSS */', read('./page.css'))
  .replace('<!-- ART_LAYERS -->', artwork)
  .replace('<!-- MOTION_EFFECTS -->', effects)
  .replace('<!-- STEP_NAV -->', STAGES.map((s, i) => `<li><a href="#etapa-${s.id}" data-step="${i}"><span class="step-dot"></span><b>0${i + 1}</b><span>${s.name}</span></a></li>`).join(''))
  .replace('<!-- FALLBACK -->', STAGES.map((s, i) => `<a class="poster-label poster-label-${i}" href="#etapa-${s.id}" data-step="${i}">${i === 1 ? 'Documentos' : s.name}</a>`).join(''))
  .replace('<!-- SCENE_LABELS -->', STAGES.map((s, i) => `<button type="button" class="scene-label" data-layer="${i}">${s.name === 'Contexto' ? 'Documentos' : s.name}</button>`).join(''))
  .replace('<!-- ANCHORS -->', STAGES.map(s => `<div id="etapa-${s.id}"></div>`).join(''))
  .replace('<!-- READING -->', STAGES.map((s, i) => `<article><span class="panel-label">0${i + 1} / ${s.name.toUpperCase()}</span><h3>${escape(s.title)}</h3><p>${escape(s.body)}</p><p class="reading-insight">${escape(s.insight)}</p></article>`).join(''));
const js = ['./model.mjs', './motion.js', './scene-objects.js', './scene.js', './app.js'].map(path => read(path)
  .replace(/^import .*;\s*$/gm, '')
  .replace(/^export /gm, '')).join('\n');
if (/<\/script/i.test(js)) throw new Error('Script de origem contém fechamento HTML inesperado.');
html = html.replace('/* LESSON_JS */', () => js);
html = withCampusShell(html, read('../../site/index.html'));
// A focused navigation for the immersive lesson; the campus footer stays shared.
html = html.replace(/<header class="topbar">[\s\S]*?<\/header>/, header => {
  const brand = header.match(/<a class="brand"[\s\S]*?<\/a>/)[0];
  return `<header class="topbar lesson-header"><div class="topbar-in lesson-header-inner">${brand}<nav class="lesson-links" aria-label="MirandasTech"><a href="https://blog.mirandastech.com.br/">Blog</a><a href="/">Laboratório</a><a href="/#bancada" aria-current="page">Aulas interativas</a></nav><span class="lesson-edition">EXPLORAR · ENTENDER · EXPERIMENTAR</span><details class="lesson-menu"><summary>Menu</summary><nav aria-label="Navegação da aula"><a href="https://blog.mirandastech.com.br/">Blog</a><a href="/">Laboratório</a><a href="#leitura">Ler a aula</a></nav></details></div></header>`;
});
const output = new URL('../../site/maquinas/agentes/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('index.html', output), '<!-- GERADO: node maquinas/agentes/build.mjs -->\n' + html);
const fonts = new URL('../../site/assets/fonts/', import.meta.url);
mkdirSync(fonts, { recursive: true });
for (const font of ['Geist_normal.woff2', 'GeistMono_normal.woff2', 'InstrumentSerif_italic.woff2']) {
  copyFileSync(new URL('../prisma/fonts/' + font, import.meta.url), new URL(font, fonts));
}
console.log(`Máquina de IA gerada: ${Math.round(html.length / 1024)} KB.`);
