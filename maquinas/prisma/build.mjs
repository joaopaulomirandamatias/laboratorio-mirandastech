// Gera index.html: página única e autônoma (fontes embutidas, sem rede).
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import * as S0 from "./scene.mjs";
import * as X from "./parts2.mjs";
import { BASES, FONTE } from "./model.mjs";
const { k, P, W, H, at, key, base, belt, plinth, deckStatic, bin, drum, lanes, hopper, gantry, housing, BINS, DRUM, HOP1, QT, ETR, BELT_A, BELT_B, BELT_C, BELT_D, BELT_E, GANTRY_B, GANTRY_D, S, L, D, slab, cyl, WORLD } = S0;
const SKILL = process.env.ANATOMY_SKILL || join(homedir(), ".claude/skills/anatomy");
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
const HERE = fileURLToPath(new URL(".", import.meta.url));
const rd = (f) => readFileSync(join(HERE, f), "utf8");
const b64 = (f) => readFileSync(join(HERE, "fonts", f)).toString("base64");

// ---- montagens ordenáveis ---------------------------------------------------
const items = [];
const add = (id, kv, svg) => items.push({ id, key: kv, svg });
const baseSvg = [base(), belt(...BELT_A), belt(...BELT_B), belt(...BELT_C), belt(...BELT_D), belt(...BELT_E), lanes(), plinth(), X.outTray(), X.details()].join("");

add("c-wall", -5e5, housing() + X.panelFrame());
DRUM.xs.forEach((x, i) => add(`drum${i}`, key(x, DRUM.y, 40), drum(x)));
add("satchel", key(WORLD.SAT.x, WORLD.SAT.y, 40), X.satchel());
for (const [id, h] of [["h1", HOP1], ["q", QT], ["etr", ETR]]) {
  const hp = hopper(h);
  add(`${id}-back`, hp.kBack, hp.back);
  add(`${id}-front`, hp.kFront, hp.front);
}
const gB = gantry(GANTRY_B);
add("gB-back", gB.kBack, gB.back); add("gB-front", gB.kFront, gB.front); add("gB-bar", gB.kBar, gB.bar);
const gD = gantry(GANTRY_D);
add("gD-back", gD.kBack, gD.back); add("gD-front", gD.kFront, gD.front); add("gD-bar", gD.kBar, gD.bar + X.readerHead());
add("press-back", key(X.PRESS.x, -19, 50), X.pressFrame());
add("press-bar", key(X.PRESS.x, 0, 70), X.pressBar());
const lamp = (c, z) => `<g class="lamp-off">${X.towerLamp(z)}</g><g class="lamp-on" data-c="${c}">${X.towerLamp(z)}</g>`;
add("tower", key(X.TOWER.x, X.TOWER.y, 60), X.towerBody() + lamp("amber", 17) + lamp("green", 21.4) + X.TOWER_CAP());
for (const b of Object.values(BINS)) {
  const s = bin(b);
  add(`bin-${b.id}-back`, s.kBack, s.back);
  add(`bin-${b.id}-front`, s.kFront, s.front);
}
items.sort((a, b) => a.key - b.key);

const lotPaths = k.slabOf({ x: -3.1, y: -2.5, w: 6.2, d: 5, r: 0.6 }, 0, 2.4, P, 2, 0.3);
const cardPaths = k.slabOf({ x: -1.7, y: -2.1, w: 3.4, d: 4.2, r: 0.3 }, 0, 0.7, P, 2);
const para = (w, d) => k.pathOf([at([-w / 2, -d / 2, 0]), at([w / 2, -d / 2, 0]), at([w / 2, d / 2, 0]), at([-w / 2, d / 2, 0])], true);
const defs = `<defs><g id="lot">${S(lotPaths, { tone: "hi", crease: "lo" })}</g><g id="card">${S(cardPaths, { tone: "hi", crease: "lo" })}</g><path id="chip" d="${para(2.7, 2.7)}"/></defs>`;

const svgBody = [
  defs,
  `<g id="base">${baseSvg}</g>`,
  `<g id="deck">${deckStatic()}</g>`,
  `<g id="world">${items.map((i) => `<g id="a-${i.id}" data-key="${i.key.toFixed(2)}">${i.svg}</g>`).join("")}</g>`,
  `<g id="panel"></g><g id="heads"></g>`,
].join("");

const svg = k.figureSvg({
  width: W, height: H, className: "pm",
  label: "Uma triadora de registros em vista isométrica, da esquerda para a direita: cinco tanques de bases de dados alimentam uma esteira; um deduplicador com scanner e jato de ar tira as duplicatas; a peneira de triagem, aberta em corte, mostra o painel do ASReview aprendendo e para quando a regra de parada é atingida; um leitor de texto completo separa os excluídos; uma prensa carimba os estudos incluídos. O fluxograma PRISMA 2020 ao lado se preenche conforme cada passo roda.",
  body: svgBody,
});

// ---- cabeças e etiquetas (placas em pé, desenhadas na tela)
const HEAD_W = 128, HEAD_H = 52;
const P2 = (x, y, z) => at([x, y, z]);
const head = (id, name, wx, wy, wz, dx, dy) => {
  const [ax, ay] = P2(wx, wy, wz);
  return { id, name, ax, ay, sx: ax + dx, sy: ay + dy, w: HEAD_W, h: HEAD_H };
};
const HEADS = [
  { ...head("A", "IDENTIFICADOS NAS BASES", -4, -80, 50, 0, 0), sx: 84, sy: 8, w: 132, h: 112, rows: BASES.map((x) => x.nome), anchors: DRUM.xs.map((x) => P2(x, DRUM.y, 74)) },
  head("B", "DUPLICATAS REMOVIDAS", 238, 0, 80, 0, 0),
  head("C", "HORAS DE TRIAGEM", 340, -47, 124, 0, 0),
  head("D", "EXCLUÍDOS NO TEXTO", 462, 0, 82, 0, 0),
  head("E", "ESTUDOS INCLUÍDOS", 533, 0, 70, 0, 0),
];
const place = { B: [356, 92], C: [498, 40], D: [596, 112], E: [648, 188] };
for (const h of HEADS) if (place[h.id]) { h.sx = place[h.id][0]; h.sy = place[h.id][1]; }
HEADS[0].rows = BASES.map((x) => x.nome);
const tags = [];
const binTag = (id, label, cx, row, w) => {
  const b = BINS[id];
  const [ax, ay] = P2(b.x + b.w / 2, b.y + b.d, 8);
  const sy = row === 1 ? 396 : 440;
  tags.push({ id, label, ax, ay, sx: cx - w / 2, sy, w, tx: cx, ty: sy });
};
{
  const [ax, ay] = P2(WORLD.SAT.x, WORLD.SAT.y, 60);
  tags.push({ id: "cit", label: ["busca de", "citações"], ax, ay, sx: 584, sy: 262, w: 76, tx: 584, ty: 281 });
}
binTag("dup", ["duplicata"], 262, 1, 82);
binTag("desenho", ["desenho não", "experimental"], 306, 2, 82);
binTag("parada", ["sem leitura:", "regra de parada"], 354, 1, 82);
binTag("segunda", ["população", "não gestante"], 412, 2, 82);
binTag("desfecho", ["desfecho de", "interesse ausente"], 500, 2, 86);

const fontCss = `
@font-face{font-family:"Geist";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${b64("Geist_normal.woff2")}) format("woff2")}
@font-face{font-family:"Geist Mono";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${b64("GeistMono_normal.woff2")}) format("woff2")}
@font-face{font-family:"Instrument Serif";font-style:italic;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${b64("InstrumentSerif_italic.woff2")}) format("woff2")}
`;
const css = rd("page.css");

const stepsHtml = ["Buscar nas bases", "Deduplicar", "Triar título e resumo", "Ler texto completo", "Incluir"]
  .map((n, i) => `<li><button type="button" class="step" data-step="${i}" data-status="todo"><span class="num">${i + 1}</span><span class="lab">${n}</span></button></li>`).join("");

const body = `
<div class="pg">
  <header class="top">
    <p class="eyebrow"><a href="/">Laboratório MirandasTech</a> · <a href="https://prisma.mirandastech.com.br/">Manual 2.2 · Revisão sistemática com PRISMA 2020</a></p>
    <h1>Como <em>9 mil</em> registros viram <em>58</em> estudos numa revisão sistemática?</h1>
    <p id="dica" class="dica" aria-live="polite"></p>
  </header>
  <div class="stage">
    <aside class="side" aria-label="Passos da máquina">
      <div class="mode" role="group" aria-label="Modo de execução">
        <button type="button" data-mode="manual" aria-pressed="true">Manual</button>
        <button type="button" data-mode="auto" aria-pressed="false">Auto</button>
      </div>
      <ol class="steps">${stepsHtml}</ol>
      <a href="#" id="recomecar" class="restart">Recomeçar</a>
      <div class="sens">
        <label for="sens"><span class="sens-t">Quebre a máquina</span><span class="sens-s">sensibilidade da string de busca</span></label>
        <input id="sens" type="range" min="0" max="1" step="0.01" value="0.5" aria-describedby="sensHint">
        <div class="sens-row"><output id="sensOut" for="sens">×1,00</output><span id="sensHint">como no estudo publicado</span></div>
        <p class="sens-n">Mexer na busca roda o modelo de novo e recomeça a máquina.</p>
      </div>
    </aside>
    <figure class="fig">
      <div class="plate">
        <div class="corners" aria-hidden="true">
          <span class="c-fig">Fig 1</span><span class="c-title">Triadora de registros</span>
          <span class="c-hint">Cada botão roda um passo na própria máquina</span>
          <span class="c-read" data-readout></span>
        </div>
        ${svg}
        <p class="foot">Fonte dos números: ${FONTE.curta} (PMC13616806; fluxograma PRISMA 2020, Fig. 1). A divisão por base, o tempo por registro e o efeito da sensibilidade são ilustrativos. Cada ficha representa um lote de registros; chips em cinza, cada um 5 registros.</p>
      </div>
    </figure>
    <aside class="flowcol" aria-label="Fluxograma PRISMA 2020">
      <div class="flowhead"><span>Saída da máquina</span><b>Fluxograma PRISMA 2020</b></div>
      <svg id="flow" class="flow" viewBox="0 0 372 498" role="img" aria-label="Fluxograma PRISMA 2020 que se preenche conforme os passos rodam"></svg>
    </aside>
  </div>
  <p class="idea">A grande ideia: <em>cada registro que sai do funil tem um motivo anotado.</em></p>
</div>`;

const live = rd("live.js")
  .replace("__WORLD__", JSON.stringify(WORLD))
  .replace("__P__", JSON.stringify(P))
  .replace("__PANEL__", JSON.stringify(X.PANEL))
  .replace("__TOWER__", JSON.stringify(X.TOWER))
  .replace("__PRESS__", JSON.stringify({ x: X.PRESS.x, zBar: X.PRESS.zBar }))
  .replace("__HEADS__", JSON.stringify(HEADS))
  .replace("__TAGS__", JSON.stringify(tags));
const modelSrc = rd("model.mjs").replace(/^export /gm, "");

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Máquina PRISMA · Laboratório MirandasTech</title><style>${fontCss}${k.ISO_CSS}${css}</style></head><body class="iso" data-theme="dark" data-mode="manual">${body}<script type="module">${(kitScript() + "\n" + modelSrc + "\n" + live).replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;
// A saída vai direto para a pasta servida pelo Caddy.
writeFileSync(join(HERE, "../../site/maquinas/prisma/index.html"), html);
console.log("index.html", (html.length / 1024).toFixed(0) + " KB", "· montagens", items.length, "· escala", P.scale.toFixed(3));
