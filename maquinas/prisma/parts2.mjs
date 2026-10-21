// Peças das estações C (painel do ASReview, torre de sinal), D (leitor), E (prensa) e bolsa de citações.
import { k, G, P, at, key, S, L, D, slab, cyl, C, HOUSE, DECK, Z_BELT, BELT_W, SAT, GANTRY_D, PRESS_X, OUT, planeX, planeMatrix } from "./scene.mjs";

// moldura do painel do ASReview na parede do fundo; o conteúdo vem do live
export const PANEL = { x: C.x0 + 10, w: 100, zTop: 120, h: 68, y: C.back + HOUSE.t };
export function panelFrame() {
  const out = [];
  const { x, w, zTop, h, y } = PANEL;
  out.push(slab(x - 3, y, zTop - h - 3, w + 6, 2.4, h + 6, { tone: "mid", r: 1.4, steps: 3, bevel: 0.5 }));
  out.push(slab(x - 0.6, y + 2.4, zTop - h - 0.6, w + 1.2, 0.8, h + 1.2, { tone: "lo", r: 0.8, steps: 2, crease: "none" }));
  const dots = [];
  for (const dx of [-1.6, w + 1.6]) for (const zz of [zTop - h - 1.6, zTop + 1.6]) dots.push(at([x + dx, y + 2.4, zz]));
  out.push(D(dots, { size: 0.5 }));
  return out.join("");
}
export const panelPlane = () => planeX(PANEL.x, PANEL.y + 3.2, PANEL.zTop);

// torre de sinal
export const TOWER = { x: C.x1 - 6, y: C.back + 12, z: 39 };
export function towerBody() {
  const { x, y, z } = TOWER;
  return [cyl(x, y, 5, z, 3, { tone: "lo", steps: 18 }), cyl(x, y, 1.6, z + 3, 14, { tone: "mid", steps: 12, crease: "none" })].join("");
}
export function towerLamp(zOff) {
  const { x, y, z } = TOWER;
  return cyl(x, y, 3.6, z + zOff, 4.4, { tone: "mid", steps: 16 });
}
export const TOWER_CAP = () => { const { x, y, z } = TOWER; return cyl(x, y, 4.2, z + 25.8, 1.4, { tone: "lo", steps: 16 }); };

// leitor de texto completo
export const READER = { x: GANTRY_D };
export function readerHead() {
  const x = READER.x;
  return [
    slab(x - 5, -19, 76, 10, 38, 3, { tone: "mid", r: 1, steps: 3 }),
    cyl(x, 0, 7.2, 70, 6, { tone: "mid", steps: 28, bevel: 0.6 }),
    cyl(x, 0, 5, 70, 0.8, { tone: "hi", steps: 24, lit: true }),
    L(k.ring(x, 0, 5.8, 76, P, 24), { tone: "lo" }),
  ].join("");
}

// prensa de carimbo (E): batente baixo; o pistão e a placa são redesenhados no live
export const PRESS = { x: PRESS_X, zBar: 66 };
export function pressFrame() {
  const x = PRESS.x;
  const out = [];
  for (const y of [-19, 19]) out.push(slab(x - 3, y - 3, 36, 6, 6, 3, { tone: "lo", r: 1 }), slab(x - 2, y - 2, 39, 4, 4, PRESS.zBar - 39, { tone: "mid", r: 0.8, bevel: 0.3 }));
  return out.join("");
}
export function pressBar() {
  const x = PRESS.x;
  return [
    slab(x - 5, -23, PRESS.zBar, 10, 46, 7, { tone: "mid", r: 1, steps: 3, bevel: 0.5 }),
    D([at([x, -19, PRESS.zBar + 7]), at([x, 19, PRESS.zBar + 7])], { size: 0.45 }),
    L(k.lineOnTop([x, -19], [x, 19], PRESS.zBar + 7, P), { tone: "faint" }),
  ].join("");
}
// pasta de saída dos estudos incluídos
export function outTray() {
  const o = OUT;
  const out = [];
  out.push(slab(o.x - 2, o.y - 2, 36, o.w + 4, o.d + 4, 2.4, { tone: "mid", r: 1.5, bevel: 0.4 }));
  for (const [x, y] of [[o.x - 1, o.y - 1], [o.x + o.w + 1, o.y - 1], [o.x - 1, o.y + o.d + 1], [o.x + o.w + 1, o.y + o.d + 1]]) out.push(cyl(x, y, 1.1, 38.4, 16, { tone: "hi", steps: 10, crease: "none" }));
  return out.join("");
}

// bolsa de citações
export function satchel() {
  const { x, y } = SAT;
  return [
    cyl(x, y, 8.4, 36, 2, { tone: "lo", steps: 22 }),
    cyl(x, y, 7.2, 38, 18, { tone: "mid", steps: 22, inner: L(k.sideArc(x, y, 7.2, 47, P, 18), { tone: "faint" }) }),
    cyl(x, y, 7.8, 56, 2.4, { tone: "hi", steps: 22, bevel: 0.5 }),
    cyl(x, y, 2, 58.4, 1.4, { tone: "mid", steps: 12 }),
  ].join("");
}

// ---- detalhes: placas de identificação, caixas de ligação e cabos, motores, venezianas
import { BELT_A, BELT_B, BELT_C, BELT_D, BELT_E, GANTRY_B } from "./scene.mjs";
export function details() {
  const out = [];
  // placas de identificação no tampo (três riscos = texto gravado)
  for (const x of [40, 196, 292, 424, 520]) {
    out.push(slab(x - 14, 33, 36, 28, 6, 0.9, { tone: "lo", r: 1, steps: 2, crease: "faint" }));
    out.push(L(k.lineOnTop([x - 10, 35], [x + 6, 35], 36.9, P) + k.lineOnTop([x - 10, 37], [x + 10, 37], 36.9, P), { tone: "mid", free: true }));
    out.push(D([at([x - 12.4, 36, 36.9]), at([x + 12.4, 36, 36.9])], { size: 0.4 }));
  }
  // caixas de ligação atrás da esteira, com cabo até o pórtico, a prensa e a torre
  const cab = (x, y, topZ) => {
    out.push(slab(x - 6, y - 4, 36, 12, 8, 8, { tone: "mid", r: 1, steps: 2, bevel: 0.3 }));
    out.push(L(k.lineOnTop([x - 4, y + 4], [x + 4, y + 4], 44, P), { tone: "faint" }));
    out.push(D([at([x - 4.5, y - 3, 44]), at([x + 4.5, y - 3, 44]), at([x, y + 4, 40])], { size: 0.45 }));
    const pts = [[x + 8, y, 40], [x + 8, -21, 40], [x, -21, 40]].map((p) => at(p));
    out.push(L(k.pathOf(pts), { tone: "lo" }));
    out.push(D([pts[0], pts[2]], { size: 0.9, tone: "hi" }));
  };
  cab(GANTRY_B + 14, -38, 80);
  cab(GANTRY_D + 14, -38, 80);
  cab(PRESS_X + 14, -38, 70);
  // cabo do pórtico B pelo montante de trás
  for (const gx of [GANTRY_B, GANTRY_D]) {
    const pts = [[gx, -21, 79], [gx - 0.2, -25, 79], [gx - 0.2, -25, 41], [gx + 14, -25, 41], [gx + 14, -34, 40]].map((p) => at(p));
    out.push(L(k.pathOf(pts), { tone: "mid" }));
    out.push(D([pts[0], pts[pts.length - 1]], { size: 0.9, tone: "hi" }));
  }
  // motores de acionamento (cilindros deitados) no início de cada esteira, atrás
  for (const [x0] of [BELT_A, BELT_B, BELT_C, BELT_D, BELT_E]) {
    const F = G.frameAlong([x0 + 6, -17.5, 41], [0, -1, 0]);
    out.push(S(G.disc(0, 11, 4.2, F, P, {}), { tone: "mid", crease: "faint" }));
    out.push(L(G.ribsOf(F, 1.5, 8.5, 4.2, 14, P), { tone: "faint" }));
    out.push(S(G.disc(11, 13.4, 2, F, P, {}), { tone: "hi", crease: "faint" }));
  }
  // veneziana de ventilação no tampo da asa dos tanques
  for (let i = 0; i < 8; i++) out.push(slab(-8 + i * 4.2, -56, 36, 2.4, 0.9, 0.5, { tone: "lo", r: 0.3, steps: 1, crease: "none" }));
  return out.join("");
}
