// Geometria estática da triadora: tudo em unidades de mundo (x = fluxo, y = largura, z = altura).
// Cada "montagem" tem uma chave de profundidade; a página mistura montagens e fichas por essa chave.
import { homedir } from "node:os";
import { join } from "node:path";

const SKILL = process.env.ANATOMY_SKILL || join(homedir(), ".claude/skills/anatomy");
export const k = await import(join(SKILL, "kit/iso-kit.mjs"));
export const G = await import(join(SKILL, "kit/lathe.mjs"));

export const W = 720, H = 500;
export const AZ = 52, EL = 30;

// ---- mundo ---------------------------------------------------------------
export const Z_BELT = 38.4; // topo da esteira: a ficha repousa aqui
export const BELT_W = 12; // meia-largura da esteira
export const DRUM = { xs: [18, 50, 82, 114, 146], y: -80, r: 11.5, h: 34, z: 36 };
export const HOP1 = { x: 180, y: -17, w: 30, d: 34, z: 36, wall: 14 };
export const BELT_A = [10, 176];
export const BELT_B = [212, 270];
export const GANTRY_B = 238;
export const JET_B = 252;
export const C = { x0: 270, x1: 400, back: -50, front: 50 };
export const DECK = { x: 304, y: -30, w: 64, d: 60 };
export const BELT_C = [372, 420];
export const QT = { x: 422, y: -12, w: 20, d: 24, z: 36, wall: 5 }; // bandeja dos relatórios a ler
export const BELT_D = [444, 494];
export const GANTRY_D = 462;
export const JET_D = 476;
export const SAT = { x: 456, y: -40 }; // bolsa de citações
export const ETR = { x: 496, y: -13, w: 20, d: 26, z: 36, wall: 5 }; // bandeja dos relatórios aceitos
export const BELT_E = [518, 548];
export const PRESS_X = 533;
export const OUT = { x: 552, y: -11, w: 18, d: 22 };

export const BINS = {
  dup: { id: "dup", x: 226, y: 62, w: 34, d: 30 },
  desenho: { id: "desenho", x: 280, y: 62, w: 38, d: 30 },
  parada: { id: "parada", x: 326, y: 62, w: 38, d: 30 },
  segunda: { id: "segunda", x: 372, y: 62, w: 34, d: 30 },
  desfecho: { id: "desfecho", x: 470, y: 62, w: 34, d: 30 },
};
export const BIN_Z = 6; // piso do cesto
export const BIN_WALL = 13;

export const P = k.fitProjection(
  [...k.boxCorners({ x: -20, y: -110, w: 600, d: 214 }, 0, 128)],
  W, H, { pad: 14, headroom: 0, azimuth: AZ, elevation: EL },
);
export const at = (p) => k.iso(p, P);
export const key = (x, y, z) => k.depthOf([x, y, z], P);

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const slab = (x, y, z, w, d, h, o = {}) =>
  S(k.slabOf({ x, y, w, d, r: o.r ?? 1 }, z, h, P, o.steps ?? 3, o.bevel ?? 0), { tone: o.tone ?? "mid", crease: o.crease ?? "faint", lit: o.lit, halo: o.halo, inner: o.inner });
const cyl = (x, y, r, z, h, o = {}) =>
  S(k.cylinder(x, y, r, z, h, P, o.steps ?? 22, o.bevel ?? 0), { tone: o.tone ?? "mid", crease: o.crease ?? "faint", lit: o.lit, inner: o.inner });
const by = (pts) => [...pts].sort((a, b) => key(a[0], a[1], 0) - key(b[0], b[1], 0));

// matriz de um plano (x para a direita, "para baixo" = −z), para texto e mostradores sobre uma face
export const planeX = (x0, y, zTop) => {
  const o = at([x0, y, zTop]);
  const ux = at([x0 + 1, y, zTop]);
  const dz = at([x0, y, zTop - 1]);
  return { o, ux: [ux[0] - o[0], ux[1] - o[1]], dz: [dz[0] - o[0], dz[1] - o[1]] };
};
const m3 = (v) => Math.round(v * 1000) / 1000;
export const planeMatrix = (pl) => `matrix(${m3(pl.ux[0])} ${m3(pl.ux[1])} ${m3(pl.dz[0])} ${m3(pl.dz[1])} ${m3(pl.o[0])} ${m3(pl.o[1])})`;

// ---- base: bancada, pernas, esteiras, convés -----------------------------
function base() {
  const out = [];
  const deck = { x: -16, y: -50, w: 590, d: 100, r: 5 };
  const wing = { x: -16, y: -108, w: 190, d: 58, r: 5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(deck, 0, 36, P)}"/><path class="iso-halo" d="${k.haloOf(wing, 0, 36, P)}"/>`);
  // pernas, pés e travessas
  const legsX = [-6, 86, 168, 270, 400, 500, 566];
  const legs = [];
  for (const x of legsX) for (const y of [-42, 42]) legs.push([x, y]);
  for (const x of [-6, 86, 166]) legs.push([x, -100]);
  for (const [x, y] of by(legs)) {
    out.push(cyl(x, y, 6.2, 0, 1.8, { tone: "lo", steps: 18 }));
    out.push(cyl(x, y, 4.2, 1.8, 26.2, { tone: "mid", steps: 16, crease: "none" }));
    out.push(cyl(x, y, 5.2, 24, 4, { tone: "lo", steps: 16 }));
  }
  for (let i = 0; i < legsX.length - 1; i++) for (const y of [-42, 42]) {
    out.push(slab(legsX[i] + 4, y - 1.2, 9, legsX[i + 1] - legsX[i] - 8, 2.4, 2.4, { tone: "lo", r: 0.6, steps: 2 }));
  }
  for (const x of legsX) out.push(slab(x - 1.2, -38, 9, 2.4, 76, 2.4, { tone: "lo", r: 0.6, steps: 2, crease: "faint" }));
  for (const [a, b] of [[-6, 86], [86, 166]]) out.push(slab(a + 4, -101.2, 9, b - a - 8, 2.4, 2.4, { tone: "lo", r: 0.6, steps: 2 }));
  for (const x of [-6, 86, 166]) out.push(slab(x - 1.2, -96, 9, 2.4, 50, 2.4, { tone: "lo", r: 0.6, steps: 2 }));
  // tampos
  out.push(S(k.slabOf(wing, 28, 8, P, 8, 1.2), { tone: "mid" }));
  out.push(S(k.slabOf(deck, 28, 8, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(deck, 4), 36, P), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(wing, 4), 36, P), { tone: "lo" }));
  for (const pl of [deck, wing]) {
    const sc = k.corners(pl, 9);
    out.push(L(sc.map(([x, y]) => k.ring(x, y, 2, 36, P, 14)).join(""), { tone: "lo" }));
    out.push(D(sc.map(([x, y]) => at([x, y, 36])), { size: 0.5 }));
  }
  // régua gravada na borda da frente do tampo
  const t = k.topTicks(-6, 566, 6, 5, 43.2, 36, [1.6, 3], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(slab(-8, 41.6, 36, 576, 2.2, 0.6, { tone: "lo", crease: "none", r: 0.5, steps: 2 }));
  return out.join("");
}

// esteira entre x0 e x1 (trilhos baixos + correia + rolos nas pontas)
function belt(x0, x1, o = {}) {
  const out = [];
  const w = BELT_W;
  out.push(slab(x0, -w - 3.2, 36, x1 - x0, 3.2, 5.2, { tone: "mid", r: 0.8, steps: 2, bevel: 0.3 }));
  out.push(slab(x0, -w, 36, x1 - x0, 2 * w, Z_BELT - 36, { tone: "lo", r: 0.5, steps: 2, crease: "faint" }));
  out.push(slab(x0, w, 36, x1 - x0, 3.2, 5.2, { tone: "mid", r: 0.8, steps: 2, bevel: 0.3 }));
  // parafusos nos trilhos
  const dots = [];
  for (let x = x0 + 6; x < x1 - 4; x += 12) { dots.push(at([x, w + 1.6, 41.2])); dots.push(at([x, -w - 1.6, 41.2])); }
  out.push(D(dots, { size: 0.4 }));
  // rolos
  for (const x of [x0 + 1.6, x1 - 1.6]) {
    const F = G.frameAlong([x, 0, 38.4 - 2.2], [0, 1, 0]);
    out.push(S(G.disc(-w - 3, w + 3, 2.2, F, P, {}), { tone: "mid", crease: "faint" }));
  }
  return out.join("");
}

// peneira: convés vibrante sobre o plinto, com malha furada
function plinth() {
  const out = [];
  const pl = { x: C.x0, y: C.back, w: C.x1 - C.x0, d: C.front - C.back, r: 3 };
  out.push(S(k.slabOf(pl, 36, 3, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(pl, 3), 39, P), { tone: "lo" }));
  const sc = k.corners(pl, 6);
  out.push(D(sc.map(([x, y]) => at([x, y, 39])), { size: 0.5 }));
  // moldura do convés + mancais amortecedores
  const dk = DECK;
  for (const [x, y] of k.corners({ x: dk.x - 2, y: dk.y - 2, w: dk.w + 4, d: dk.d + 4 }, 3)) {
    out.push(cyl(x, y, 3.4, 39, 1.4, { tone: "lo", steps: 14 }));
  }
  return out.join("");
}

export function deckStatic() {
  // a malha, a moldura e as molas; o conjunto vibra em bloco no live
  const out = [];
  const dk = DECK;
  const frame = { x: dk.x - 2, y: dk.y - 2, w: dk.w + 4, d: dk.d + 4, r: 2 };
  out.push(S(k.slabOf(frame, 40.4, 2.6, P, 3, 0.5), { tone: "mid", crease: "faint" }));
  const mesh = { x: dk.x + 1.5, y: dk.y + 1.5, w: dk.w - 3, d: dk.d - 3, r: 1 };
  out.push(S(k.slabOf(mesh, 41.2, 1.8, P, 3), { tone: "lo", crease: "faint", flat: false }));
  const pts = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j < 20; j++) pts.push(at([dk.x + 4 + i * 2.7, dk.y + 4 + j * 2.7, 43]));
  out.push(D(pts, { size: 0.34, tone: "mid" }));
  out.push(L(k.planOutline(mesh, 43, P, 3), { tone: "mid" }));
  return out.join("");
}

// cesto: devolve { back, front } e a posição dos encaixes das fichas
export function bin(b) {
  const z = BIN_Z, h = BIN_WALL;
  const back = [];
  for (const [x, y] of [[b.x + 4, b.y + 4], [b.x + b.w - 4, b.y + 4], [b.x + 4, b.y + b.d - 4], [b.x + b.w - 4, b.y + b.d - 4]]) {
    back.push(cyl(x, y, 2.6, 0, z, { tone: "lo", steps: 12, crease: "none" }));
  }
  back.push(`<path class="iso-halo" d="${k.haloOf({ x: b.x, y: b.y, w: b.w, d: b.d, r: 2 }, 0, 6, P)}"/>`);
  back.push(slab(b.x, b.y, z, b.w, b.d, 2, { tone: "mid", r: 2, steps: 3 }));
  back.push(slab(b.x, b.y, z + 2, b.w, 2, h - 2, { tone: "mid", r: 0.6, steps: 2 })); // fundo (atrás)
  back.push(slab(b.x, b.y + 2, z + 2, 2, b.d - 4, h - 2, { tone: "mid", r: 0.6, steps: 2 })); // esquerda
  const front = [];
  front.push(slab(b.x + b.w - 2, b.y + 2, z + 2, 2, b.d - 4, h - 2, { tone: "mid", r: 0.6, steps: 2 })); // direita
  front.push(slab(b.x, b.y + b.d - 2, z + 2, b.w, 2, h - 2, { tone: "mid", r: 0.6, steps: 2, bevel: 0.4 })); // frente
  front.push(L(k.lineOnTop([b.x + 3, b.y + b.d - 2], [b.x + b.w - 3, b.y + b.d - 2], z + h, P), { tone: "hi" }));
  const dots = [at([b.x + 4, b.y + b.d, z + h - 3]), at([b.x + b.w - 4, b.y + b.d, z + h - 3])];
  front.push(D(dots, { size: 0.45 }));
  return { back: back.join(""), front: front.join(""), kBack: key(b.x, b.y, z), kFront: key(b.x + b.w, b.y + b.d, z + h) - 0.01 };
}

// tanque de base de dados (cilindro, como o ícone), com bandas e visor de nível
function drum(x) {
  const out = [];
  const { y, r, h, z } = DRUM;
  out.push(cyl(x, y, r + 1.6, z, 2.2, { tone: "lo", steps: 28 }));
  out.push(cyl(x, y, r, z + 2.2, h - 2.2, { tone: "mid", steps: 28, inner: L(k.sideArc(x, y, r, z + 2.2 + (h - 2.2) * 0.34, P, 20) + k.sideArc(x, y, r, z + 2.2 + (h - 2.2) * 0.68, P, 20), { tone: "faint" }) }));
  out.push(L(k.knurl(x, y, r, z + 6, z + h - 6, 22, P, 0.4), { tone: "faint" }));
  for (const f of [0.34, 0.68]) out.push(cyl(x, y, r + 0.7, z + 2.2 + (h - 2.2) * f - 1, 2, { tone: "lo", steps: 28, crease: "faint" }));
  out.push(cyl(x, y, r + 0.9, z + h, 3, { tone: "hi", steps: 28, bevel: 0.6 }));
  out.push(L(k.ring(x, y, r - 3, z + h + 3, P, 28), { tone: "lo" }));
  out.push(cyl(x, y, 2.4, z + h + 3, 1.6, { tone: "mid", steps: 12 }));
  return out.join("");
}

// conduto lateral de cada tanque até a esteira (a ficha desce por ele)
function lanes() {
  const out = [];
  for (const x of DRUM.xs) {
    out.push(slab(x - 5.4, DRUM.y + DRUM.r + 0.4, 36, 10.8, -12 - (DRUM.y + DRUM.r) - 0.4, Z_BELT - 36, { tone: "lo", r: 0.5, steps: 2, crease: "faint" }));
    out.push(slab(x - 5.4, DRUM.y + DRUM.r + 0.4, Z_BELT, 1.2, -12 - (DRUM.y + DRUM.r) - 0.4, 1.8, { tone: "mid", r: 0.3, steps: 2, crease: "none" }));
    out.push(slab(x + 4.2, DRUM.y + DRUM.r + 0.4, Z_BELT, 1.2, -12 - (DRUM.y + DRUM.r) - 0.4, 1.8, { tone: "mid", r: 0.3, steps: 2, crease: "none" }));
  }
  return out.join("");
}

function hopper(h, name) {
  const back = [], front = [];
  back.push(slab(h.x, h.y, h.z, h.w, h.d, 2, { tone: "lo", r: 1.5 }));
  back.push(slab(h.x, h.y, h.z + 2, h.w, 2, h.wall, { tone: "mid", r: 0.5, steps: 2 }));
  back.push(slab(h.x, h.y + 2, h.z + 2, 2, h.d - 4, h.wall, { tone: "mid", r: 0.5, steps: 2 }));
  front.push(slab(h.x + h.w - 2, h.y + 2, h.z + 2, 2, h.d - 4, h.wall, { tone: "mid", r: 0.5, steps: 2 }));
  front.push(slab(h.x, h.y + h.d - 2, h.z + 2, h.w, 2, h.wall, { tone: "mid", r: 0.5, steps: 2, bevel: 0.4 }));
  front.push(L(k.lineOnTop([h.x + 2, h.y + h.d - 2], [h.x + h.w - 2, h.y + h.d - 2], h.z + 2 + h.wall, P), { tone: "hi" }));
  return { back: back.join(""), front: front.join(""), kBack: key(h.x, h.y, h.z), kFront: key(h.x + h.w, h.y + h.d, h.z + h.wall) - 0.01 };
}

// pórtico do deduplicador / leitor: dois montantes e travessa
function gantry(x, tall = 40) {
  const post = (y) => [
    slab(x - 3, y - 3, 36, 6, 6, 3, { tone: "lo", r: 1, steps: 3 }),
    slab(x - 2, y - 2, 39, 4, 4, tall, { tone: "mid", r: 0.8, steps: 3, bevel: 0.3 }),
  ].join("");
  const back = post(-21);
  const front = post(21);
  const bar = [
    slab(x - 4, -24, 36 + 3 + tall, 8, 48, 5, { tone: "mid", r: 1, steps: 3, bevel: 0.5 }),
    L(k.lineOnTop([x, -21], [x, 21], 36 + 3 + tall + 5, P), { tone: "faint" }),
    D([at([x, -21, 36 + 3 + tall + 5]), at([x, 21, 36 + 3 + tall + 5])], { size: 0.45 }),
  ].join("");
  return { back, front, bar, kBack: key(x, -21, 50), kFront: key(x, 21, 50), kBar: key(x, 0, 36 + tall + 8) };
}

// caixa da peneira em corte: parede do fundo e parede da esquerda com túnel
export const HOUSE = { z0: 39, z1: 124, t: 6, tunnel: 14, lintel: 54 };
function housing() {
  const out = [];
  const { z0, z1, t, tunnel, lintel } = HOUSE;
  // parede do fundo
  out.push(slab(C.x0, C.back, z0, C.x1 - C.x0, t, z1 - z0, { tone: "mid", r: 1, steps: 3, bevel: 0.6 }));
  // parede da esquerda: duas metades e verga (túnel por onde a esteira entra)
  out.push(slab(C.x0, C.back + t, z0, t, -tunnel - (C.back + t), z1 - z0, { tone: "mid", r: 0.5, steps: 2 }));
  out.push(slab(C.x0, tunnel, z0, t, C.front - tunnel, z1 - z0, { tone: "mid", r: 0.5, steps: 2, bevel: 0.4 }));
  out.push(slab(C.x0, -tunnel, lintel, t, 2 * tunnel, z1 - lintel, { tone: "mid", r: 0.5, steps: 2 }));
  // hachura nas faces cortadas (extremo da parede do fundo e extremo da parede da esquerda)
  const hatch = [];
  for (let z = z0 + 3; z < z1; z += 5) {
    hatch.push(k.segment([C.x1, C.back + 0.6, z], [C.x1, C.back + t - 0.6, Math.min(z + t - 1.2, z1 - 0.4)], P));
    hatch.push(k.segment([C.x0 + 0.6, C.front, z], [C.x0 + t - 0.6, C.front, Math.min(z + t - 1.2, z1 - 0.4)], P));
  }
  out.push(L(hatch.join(""), { tone: "mid" }));
  // costura e parafusos na parede do fundo
  const rv = [];
  for (let x = C.x0 + 10; x < C.x1 - 4; x += 12) { rv.push(at([x, C.back + t, z0 + 5])); rv.push(at([x, C.back + t, z1 - 5])); }
  out.push(D(rv, { size: 0.45 }));
  // túnel: batente
  out.push(L(k.segment([C.x0 + t, -tunnel, z0], [C.x0 + t, -tunnel, lintel], P) + k.segment([C.x0 + t, tunnel, z0], [C.x0 + t, tunnel, lintel], P) + k.segment([C.x0 + t, -tunnel, lintel], [C.x0 + t, tunnel, lintel], P), { tone: "lo" }));
  return out.join("");
}

export { S, L, D, slab, cyl, by, base, belt, plinth, drum, lanes, hopper, gantry, housing };

export const WORLD = { Z_BELT, BELT_W, DRUM, HOP1, BELT_A, BELT_B, GANTRY_B, JET_B, C, DECK, BELT_C, QT, BELT_D, GANTRY_D, JET_D, SAT, ETR, BELT_E, PRESS_X, OUT, BINS, BIN_Z, BIN_WALL };
