// Vive dentro de <script type="module">, depois do kit e do modelo (sem "export").
// Tudo o que se move é função pura do relógio global G e do modelo `m`.
const PRISMA = (() => {
const WORLD = __WORLD__;
const PJ = __P__;
const PANEL = __PANEL__;
const TOWER = __TOWER__;
const PRESS = __PRESS__;
const HEADS = __HEADS__;
const ZB = WORLD.Z_BELT;
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const frac = (v) => v - Math.floor(v);
const cam = cameraOf(PJ);
const proj = (x, y, z) => [(x * cam.sinA - y * cam.cosA) * cam.k, ((x * cam.cosA + y * cam.sinA) * cam.sinE - z * cam.cosE) * cam.k];
const SVGNS = "http://www.w3.org/2000/svg";
const svg = $("svg.pm");
const world = $("#world", svg);
const fmt = milhar;

// ---------------------------------------------------------------- tempo
const GAP = 0.9; // pausa entre passos na linha do tempo (sem movimento)
const NAMES = ["Buscar nas bases", "Deduplicar", "Triar título e resumo", "Ler texto completo", "Incluir"];

// trajetória por segmentos: { t0, t1, a, b, mode: lin | arc | ease, peak }
function posAt(segs, t) {
  if (t <= segs[0].t0) return segs[0].a;
  const last = segs[segs.length - 1];
  if (t >= last.t1) return last.b;
  for (const s of segs) {
    if (t > s.t1) continue;
    let u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
    if (s.mode === "ease") u = sm(u);
    const p = [lerp(s.a[0], s.b[0], u), lerp(s.a[1], s.b[1], u), lerp(s.a[2], s.b[2], u)];
    if (s.mode === "arc") p[2] += (s.peak ?? 8) * 4 * u * (1 - u);
    return p;
  }
  return last.b;
}

function grid(box, cellW, cellD, layerH, margin = 2.6) {
  const cols = Math.max(1, Math.floor((box.w - 2 * margin) / cellW));
  const rows = Math.max(1, Math.floor((box.d - 2 * margin) / cellD));
  const cap = cols * rows;
  const x0 = box.x + (box.w - cols * cellW) / 2 + cellW / 2;
  const y0 = box.y + (box.d - rows * cellD) / 2 + cellD / 2;
  return (i, z0) => {
    const layer = Math.floor(i / cap), idx = i % cap;
    const c = idx % cols, r = Math.floor(idx / cols);
    return [x0 + c * cellW, y0 + r * cellD, z0 + layer * layerH];
  };
}
const innerBin = (b) => ({ x: b.x + 2, y: b.y + 2, w: b.w - 4, d: b.d - 4 });

// ---------------------------------------------------------------- plano
function plan(m) {
  const tokens = [];
  const T0 = [], D = [];
  const mk = (o) => { o.id = tokens.length; tokens.push(o); return o; };
  const B = WORLD.BINS;
  const ev = { drum: [[], [], [], [], []], cit: [], dup: [], tail: [], seg: [], segOk: [], read: [], exc: [], inc: [], aval: [], ret: [] };
  const perm = (n, seed) => Array.from({ length: n }, (_, i) => i).sort((a, b) => frac(a * 0.6180339 + seed) - frac(b * 0.6180339 + seed));
  const slotZ = WORLD.HOP1.z + 2;

  // ---- passo 1: tanques → esteira A → bandeja H1
  const N1 = clamp(Math.round(m.total / 260), 12, 48);
  const per = reparte(N1, m.bases.map((b) => b.n));
  const seq = [];
  per.forEach((n, kd) => { for (let i = 0; i < n; i++) seq.push({ kd, pos: (i + 0.5) / n }); });
  seq.sort((a, b) => a.pos - b.pos || a.kd - b.kd);
  const vA = 95, vL = 55, gap1 = 0.1;
  const yL0 = WORLD.DRUM.y + WORLD.DRUM.r - 4, tLane = (0 - yL0) / vL;
  const xE = WORLD.BELT_A[1];
  const tBelt = (x) => (xE - x) / vA;
  let A0 = 0;
  seq.forEach((s, j) => { A0 = Math.max(A0, tBelt(WORLD.DRUM.xs[s.kd]) + tLane - j * gap1 + 0.25); });
  const h1slot = grid({ x: WORLD.HOP1.x + 2, y: WORLD.HOP1.y + 2, w: WORLD.HOP1.w - 4, d: WORLD.HOP1.d - 4 }, 6.8, 9, 2.5);
  const h1pos = (j) => h1slot(j, slotZ);
  let end1 = 0;
  seq.forEach((s, j) => {
    const x = WORLD.DRUM.xs[s.kd];
    const a = A0 + j * gap1;
    const s0 = a - tBelt(x) - tLane;
    const s1 = s0 + tLane;
    const t = mk({ kind: "lot", cls: "v-card", fadeIn: [s0, s0 + 0.3], segs: [
      { t0: s0, t1: s1, a: [x, yL0, ZB], b: [x, 0, ZB], mode: "lin" },
      { t0: s1, t1: a, a: [x, 0, ZB], b: [xE, 0, ZB], mode: "lin" },
      { t0: a, t1: a + 0.45, a: [xE, 0, ZB], b: h1pos(j), mode: "arc", peak: 9 },
    ] });
    t.h1 = j;
    ev.drum[s.kd].push(s0 + 0.2);
    end1 = Math.max(end1, a + 0.45);
  });
  ev.cit.push(0.9);
  T0[0] = 0; D[0] = end1 + 0.5;
  const belt1 = [[0.0, D[0]]]; // esteira A gira nesta janela

  // ---- passo 2: bandeja H1 → esteira B → pórtico (scanner) → sopro → cestos / monte
  T0[1] = T0[0] + D[0] + GAP;
  const gB = 0.2, vB = 70;
  const nDup = Math.round((N1 * m.duplicatas) / m.total);
  const order2 = perm(N1, 0.17);
  const dupSet = new Set(order2.slice(0, nDup));
  const xin = WORLD.BELT_B[0] + 4, xk = WORLD.JET_B;
  const pileBox = { x: 277, y: -13, w: 26, d: 26 };
  const pileSlot = grid(pileBox, 6.4, 8.4, 2.5, 1);
  const pileZ0 = 39;
  const dupSlot = grid(innerBin(B.dup), 6.8, 6, 2.6);
  const binZ = WORLD.BIN_Z + 2;
  let rankDup = 0, rankSurv = 0, end2 = 0;
  const survivors = [];
  const kicks = [];
  for (let i = 0; i < N1; i++) {
    const t = tokens.find((q) => q.h1 === N1 - 1 - i); // LIFO: o de cima sai primeiro
    const r = T0[1] + 0.4 + i * gB;
    const tk = r + 0.5 + (xk - xin) / vB;
    t.segs.push({ t0: r, t1: r + 0.5, a: h1pos(t.h1), b: [xin, 0, ZB], mode: "arc", peak: 12 });
    if (dupSet.has(i)) {
      t.cls = "v-card";
      t.segs.push({ t0: r + 0.5, t1: tk, a: [xin, 0, ZB], b: [xk, 0, ZB], mode: "lin" });
      const dest = dupSlot(rankDup++, binZ);
      t.segs.push({ t0: tk, t1: tk + 0.6, a: [xk, 0, ZB], b: dest, mode: "arc", peak: 14 });
      t.tint = { t0: tk, t1: tk + 0.6, cls: "v-dup" };
      ev.dup.push(tk + 0.3);
      kicks.push(tk);
      end2 = Math.max(end2, tk + 0.6);
    } else {
      const xe = WORLD.BELT_B[1];
      const ta = r + 0.5 + (xe - xin) / vB;
      t.segs.push({ t0: r + 0.5, t1: ta, a: [xin, 0, ZB], b: [xe, 0, ZB], mode: "lin" });
      const dest = pileSlot(rankSurv, pileZ0);
      t.segs.push({ t0: ta, t1: ta + 0.5, a: [xe, 0, ZB], b: dest, mode: "arc", peak: 10 });
      t.pile = rankSurv++;
      survivors.push(t);
      end2 = Math.max(end2, ta + 0.5);
    }
    t.scanAt = r + 0.5 + (WORLD.GANTRY_B - xin) / vB;
  }
  D[1] = end2 - T0[1] + 0.4;
  const scans2 = tokens.filter((q) => q.scanAt).map((q) => q.scanAt);
  const belt2 = [[T0[1] + 0.2, T0[1] + D[1] - 0.3]];

  // ---- passo 3: peneira (ASReview) → cestos, monte, mesa, esteira C → bandeja Q
  T0[2] = T0[1] + D[1] + GAP;
  let D3 = 14;
  const tr = 0.6 * D3;
  const tStop = T0[2] + tr, tDump = tStop + 0.15;
  const nRead = clamp(Math.round((survivors.length * m.lidos) / m.unicos), 1, Math.max(1, survivors.length - 1));
  const deckC = [330, 0, 41.4];
  const readOrder = survivors.slice().reverse(); // de cima do monte para baixo
  readOrder.forEach((t, c) => {
    if (c < nRead) {
      const tr0 = T0[2] + 0.6 + ((tr - 1.6) * (c + 0.5)) / nRead;
      t.segs.push({ t0: tr0, t1: tr0 + 0.8, a: t.segs[t.segs.length - 1].b, b: deckC, mode: "arc", peak: 4 });
      t.fadeOut = [tr0 + 0.5, tr0 + 0.85];
      ev.read.push(tr0 + 0.4);
    } else {
      const k2 = c - nRead;
      const t0 = tDump + k2 * 0.07;
      const slot = grid(innerBin(B.parada), 6.8, 6, 2.6)(k2, binZ);
      t.segs.push({ t0, t1: t0 + 0.75, a: t.segs[t.segs.length - 1].b, b: slot, mode: "arc", peak: 16 });
      t.tint = { t0, t1: t0 + 0.75, cls: "v-exc" };
      ev.tail.push(t0 + 0.35);
    }
  });
  const nTail = survivors.length - nRead;
  const jetsDump = [tDump - 0.1, tDump + nTail * 0.07 + 0.3];

  // fichas de decisão (1 ficha = 5 registros)
  const rastro = trilha(m);
  const L = m.lidos;
  const decT = (i) => T0[2] + (tr * (i + 1)) / L;
  const desSlot = grid(innerBin(B.desenho), 3.1, 3.1, 1.6, 2.4);
  const mesaBox = { x: 352.5, y: -26, w: 13, d: 52 };
  const mesaSlot = grid(mesaBox, 3.1, 3.1, 1.4, 1);
  let rel = 0, irr = 0, nChipRel = 0;
  const chips = [];
  for (let i = 0; i < L; i++) {
    const isRel = rastro[i] === 1;
    const n = isRel ? rel++ : irr++;
    if (n % 5 !== 0) continue;
    const t0 = decT(i);
    const jx = 330 + (frac(i * 0.7548) - 0.5) * 18, jy = (frac(i * 0.5698) - 0.5) * 26;
    if (isRel) {
      const slot = mesaSlot(nChipRel, 43.2);
      const t = mk({ kind: "chip", cls: "v-rel", fadeIn: [t0, t0 + 0.15], segs: [{ t0, t1: t0 + 0.7, a: [jx, jy, 43.2], b: slot, mode: "ease" }] });
      t.mesa = nChipRel++;
      chips.push(t);
    } else {
      const slot = desSlot(n / 5, binZ);
      mk({ kind: "chip", cls: "v-exc", fadeIn: [t0, t0 + 0.15], segs: [{ t0, t1: t0 + 0.85, a: [jx, jy, 43.2], b: slot, mode: "arc", peak: 11 }] });
    }
  }
  // 2ª leitura: a mesa esvazia, 119 de 192 vão ao cesto, o resto vira relatório
  const tS = T0[2] + 0.72 * 14;
  const nChip = chips.length;
  const nExcChip = Math.round((nChip * m.excSegunda) / m.segundaLeitura);
  const pm = perm(nChip, 0.41);
  const excSet = new Set(pm.slice(0, nExcChip));
  const segSlot = grid(innerBin(B.segunda), 3.1, 3.1, 1.6, 2.4);
  const qBox = { x: WORLD.QT.x + 2, y: WORLD.QT.y + 2, w: WORLD.QT.w - 4, d: WORLD.QT.d - 4 };
  const qSlot = grid(qBox, 3.6, 4.4, 0.8, 0.4);
  const qZ0 = WORLD.QT.z + 2;
  let rankExc = 0, rankSurvChip = 0, sheetN = 0, end3 = 0;
  const nOk = nChip - nExcChip;
  const sheetsOf = (c) => Math.floor(((c + 1) * m.buscados) / nOk) - Math.floor((c * m.buscados) / nOk);
  const sheets = [];
  const xC0 = WORLD.BELT_C[0] + 4, xC1 = WORLD.BELT_C[1], vC = 70;
  for (let i = 0; i < nChip; i++) {
    const t = chips.find((q) => q.mesa === nChip - 1 - i);
    const r = tS + 0.15 + i * 0.05;
    const from = t.segs[t.segs.length - 1].b;
    if (excSet.has(i)) {
      const dest = segSlot(rankExc++, binZ);
      t.segs.push({ t0: r, t1: r + 0.6, a: from, b: dest, mode: "arc", peak: 12 });
      t.tint = { t0: r, t1: r + 0.6, cls: "v-exc" };
      ev.seg.push(r + 0.3);
      end3 = Math.max(end3, r + 0.6);
    } else {
      const c = rankSurvChip++;
      const ta = r + 0.4 + (xC1 - xC0) / vC;
      t.segs.push({ t0: r, t1: r + 0.4, a: from, b: [xC0, 0, ZB + 0.4], mode: "arc", peak: 6 });
      t.segs.push({ t0: r + 0.4, t1: ta, a: [xC0, 0, ZB + 0.4], b: [xC1, 0, ZB + 0.4], mode: "lin" });
      t.fadeOut = [ta - 0.1, ta + 0.2];
      const n = sheetsOf(c);
      for (let q = 0; q < n; q++) {
        const sl = qSlot(sheetN, qZ0);
        const t1 = ta + 0.02 + q * 0.08;
        const s = mk({ kind: "card", cls: "v-card", fadeIn: [t1 - 0.05, t1 + 0.2], segs: [{ t0: t1 - 0.05, t1: t1 + 0.4, a: [xC1 + 1, 0, ZB + 0.4], b: sl, mode: "arc", peak: 7 }] });
        s.q = sheetN++;
        sheets.push(s);
        ev.ret.push(t1 + 0.2);
        end3 = Math.max(end3, t1 + 0.4);
      }
      ev.segOk.push(r + 0.3);
    }
  }
  D3 = Math.max(D3, end3 - T0[2] + 0.4);
  D[2] = D3;
  const belt3 = [[tS, T0[2] + D3 - 0.2]];

  // ---- passo 4: bandeja Q → esteira D → leitor → sopro → cesto / bandeja E
  T0[3] = T0[2] + D[2] + GAP;
  const gD = 0.085, vD = 70;
  const nIn = sheets.length + 1; // + o relatório da busca de citações
  const cIdx = Math.min(20, nIn - 1);
  const nEx = m.excTexto;
  const pd = perm(nIn, 0.29).filter((i) => i !== cIdx);
  const exSet = new Set(pd.slice(0, nEx));
  const xin4 = WORLD.BELT_D[0] + 4, xk4 = WORLD.JET_D, xe4 = WORLD.BELT_D[1];
  const dfSlot = grid(innerBin(B.desfecho), 3.6, 4.4, 0.9, 2.4);
  const etrSlot = grid({ x: WORLD.ETR.x + 2, y: WORLD.ETR.y + 2, w: WORLD.ETR.w - 4, d: WORLD.ETR.d - 4 }, 3.6, 4.4, 0.8, 0.4);
  const etrZ0 = WORLD.ETR.z + 2;
  let rankEx = 0, rankOk = 0, end4 = 0, qi = 0;
  const accepted = [];
  const scans4 = [];
  for (let i = 0; i < nIn; i++) {
    let t;
    const r = T0[3] + 0.4 + i * gD;
    if (i === cIdx) {
      const xs = WORLD.SAT.x;
      const tp = r + 0.5 + (xs - xin4) / vD; // passa por x = SAT.x
      t = mk({ kind: "card", cls: "v-cit", fadeIn: [tp - 0.8, tp - 0.5], segs: [
        { t0: tp - 0.8, t1: tp, a: [xs, WORLD.SAT.y, 58.4], b: [xs, 0, ZB], mode: "arc", peak: 6 },
        { t0: tp, t1: tp + (xe4 - xs) / vD, a: [xs, 0, ZB], b: [xe4, 0, ZB], mode: "lin" },
      ] });
      t.isCit = true;
      ev.cit4 = tp - 0.4;
    } else {
      t = sheets[sheets.length - 1 - qi++];
      t.segs.push({ t0: r, t1: r + 0.5, a: t.segs[t.segs.length - 1].b, b: [xin4, 0, ZB], mode: "arc", peak: 8 });
      t.segs.push({ t0: r + 0.5, t1: r + 0.5 + (xe4 - xin4) / vD, a: [xin4, 0, ZB], b: [xe4, 0, ZB], mode: "lin" });
    }
    ev.aval.push(r + 0.4);
    const scanT = r + 0.5 + (WORLD.GANTRY_D - xin4) / vD;
    scans4.push(scanT);
    if (exSet.has(i)) {
      const tk = r + 0.5 + (xk4 - xin4) / vD;
      // corta a trajetória em xk4 e lança ao cesto
      t.segs[t.segs.length - 1] = { t0: r + 0.5, t1: tk, a: [xin4, 0, ZB], b: [xk4, 0, ZB], mode: "lin" };
      t.segs.push({ t0: tk, t1: tk + 0.55, a: [xk4, 0, ZB], b: dfSlot(rankEx++, binZ), mode: "arc", peak: 12 });
      t.tint = { t0: tk, t1: tk + 0.55, cls: "v-exc" };
      ev.exc.push(tk + 0.3);
      end4 = Math.max(end4, tk + 0.55);
    } else {
      const te = t.segs[t.segs.length - 1].t1;
      const sl = etrSlot(rankOk++, etrZ0);
      t.segs.push({ t0: te, t1: te + 0.45, a: [xe4, 0, ZB], b: sl, mode: "arc", peak: 7 });
      t.etr = rankOk - 1;
      accepted.push(t);
      end4 = Math.max(end4, te + 0.45);
    }
  }
  D[3] = end4 - T0[3] + 0.4;
  const belt4 = [[T0[3] + 0.2, T0[3] + D[3] - 0.3]];

  // ---- passo 5: bandeja E → esteira E → prensa → pasta
  T0[4] = T0[3] + D[3] + GAP;
  const vE = 70, gE = 0.085;
  const xin5 = WORLD.BELT_E[0] + 4, xe5 = WORLD.BELT_E[1], xp = WORLD.PRESS_X;
  const outBox = { x: WORLD.OUT.x, y: WORLD.OUT.y, w: WORLD.OUT.w, d: WORLD.OUT.d };
  const outSlot = grid(outBox, 3.6, 4.2, 0.9, 0.5);
  let end5 = 0;
  const stamps = [];
  const accSorted = accepted.slice().sort((a, b) => b.etr - a.etr); // de cima para baixo
  accSorted.forEach((t, i) => {
    const r = T0[4] + 0.4 + i * gE;
    const from = t.segs[t.segs.length - 1].b;
    const ta = r + 0.5, tp = ta + (xp - xin5) / vE, te = ta + (xe5 - xin5) / vE;
    t.segs.push({ t0: r, t1: ta, a: from, b: [xin5, 0, ZB], mode: "arc", peak: 10 });
    t.segs.push({ t0: ta, t1: te, a: [xin5, 0, ZB], b: [xe5, 0, ZB], mode: "lin" });
    t.segs.push({ t0: te, t1: te + 0.45, a: [xe5, 0, ZB], b: outSlot(i, 38), mode: "arc", peak: 7 });
    t.tint2 = { t0: tp - 0.02, t1: tp + 0.18, cls: "v-ok" };
    stamps.push(tp);
    ev.inc.push(te + 0.3);
    end5 = Math.max(end5, te + 0.45);
  });
  D[4] = end5 - T0[4] + 0.4;
  const belt5 = [[T0[4] + 0.2, T0[4] + D[4] - 0.3]];
  const total = T0[4] + D[4];
  // o tint do passo 4 (sopro) é mais específico; o do 5 sobrepõe
  return { m, tokens, T0, D, total, ev, N1, nDup, tr, belts: { A: belt1, B: belt2, C: belt3, D: belt4, E: belt5 }, scans2, scans4, kicks, stamps, jets: { b: kicks, dump: jetsDump, d: ev.exc.map((t) => t - 0.3) }, tS, tStop, D3, nRead, nTail };
}

// ---------------------------------------------------------------- leituras (contadores)
const fr = (times, G, w = 0.4) => (times.length ? times.reduce((a, t) => a + sm((G - t) / w), 0) / times.length : 0);
function readouts(pl, G) {
  const m = pl.m, ev = pl.ev;
  const q = clamp((G - pl.T0[2]) / 14, 0, 1);
  const reading = G <= pl.T0[2] ? 0 : Math.min(1, (G - pl.T0[2]) / pl.tr);
  const lidos = Math.round(m.lidos * reading);
  const rastro = pl.rastro || (pl.rastro = trilha(m));
  let relevantes = 0, seguidos = 0;
  if (!pl.cum) {
    pl.cum = { rel: new Int32Array(m.lidos + 1), run: new Int32Array(m.lidos + 1) };
    for (let i = 0; i < m.lidos; i++) {
      pl.cum.rel[i + 1] = pl.cum.rel[i] + rastro[i];
      pl.cum.run[i + 1] = rastro[i] ? 0 : pl.cum.run[i] + 1;
    }
  }
  relevantes = pl.cum.rel[lidos]; seguidos = pl.cum.run[lidos];
  const porBase = m.bases.map((b, i) => Math.round(b.n * fr(ev.drum[i], G, 0.5)));
  const ident = porBase.reduce((a, b) => a + b, 0);
  const cit = Math.round(m.citacoes * fr(ev.cit, G, 0.5));
  const dup = Math.round(m.duplicatas * fr(ev.dup, G, 0.4));
  const tail = Math.round(m.naoVistos * fr(ev.tail, G, 0.4));
  const exc2 = Math.round(m.excSegunda * fr(ev.seg, G, 0.4));
  const seguem = Math.round(m.buscados * fr(ev.ret, G, 0.3));
  const aval = Math.round(m.avaliados * fr(ev.aval, G, 0.3));
  const excT = Math.round(m.excTexto * fr(ev.exc, G, 0.4));
  const inc = Math.round(m.incluidos * fr(ev.inc, G, 0.4));
  const secDone = Math.round(m.segundaLeitura * fr(ev.seg.concat(ev.segOk), G, 0.4));
  const horas = (lidos * TEMPO.minTitulo + secDone * TEMPO.minSegunda + aval * TEMPO.minTexto) / 60;
  return { q, lidos, relevantes, seguidos, parou: lidos >= m.lidos && G > pl.T0[2], excTit: lidos - relevantes, porBase, ident, cit, dup, tail, exc2, seguem, aval, excT, inc, horas,
    exclTriagem: tail + (lidos - relevantes) + exc2 };
}

// ---------------------------------------------------------------- peças móveis
const pool = [];
const useOf = (n) => {
  if (!pool[n]) {
    const g = document.createElementNS(SVGNS, "g");
    const u = document.createElementNS(SVGNS, "use");
    const t = document.createElementNS(SVGNS, "use");
    g.append(u, t); g.style.display = "none";
    pool[n] = { g, u, t, key: -1e9 };
    world.appendChild(g);
  }
  return pool[n];
};
const VARS = {
  "v-card": "--anatomy-paper:#a9d3e6;--anatomy-top:#dff3fc;--anatomy-shade-0:#6b98b2;--anatomy-shade-1:#7aa8c3;--anatomy-shade-2:#8cbbd5;--anatomy-shade-3:#9dcbe4;--anatomy-hi:#3f6f8c;--anatomy-lo:#4c7c99;--anatomy-faint:#6a9ab5",
  "v-dup": "--anatomy-paper:#c99a45;--anatomy-top:#f6d089;--anatomy-shade-0:#98702c;--anatomy-shade-1:#ab8035;--anatomy-shade-2:#bf9240;--anatomy-shade-3:#d3a54f;--anatomy-hi:#7a5819;--anatomy-lo:#8b6620;--anatomy-faint:#a57b2e",
  "v-exc": "--anatomy-paper:#52657d;--anatomy-top:#8497ae;--anatomy-shade-0:#3a4a5f;--anatomy-shade-1:#42536a;--anatomy-shade-2:#4a5c74;--anatomy-shade-3:#53667e;--anatomy-hi:#2e3c4f;--anatomy-lo:#34445a;--anatomy-faint:#3d4e64",
  "v-rel": "--anatomy-paper:#27c8dd;--anatomy-top:#8ff5ff;--anatomy-shade-0:#1297ab;--anatomy-shade-1:#17a8bd;--anatomy-shade-2:#1db9ce;--anatomy-shade-3:#24c8dd;--anatomy-hi:#0c6070;--anatomy-lo:#0f7587;--anatomy-faint:#16899c",
  "v-ok": "--anatomy-paper:#27c8dd;--anatomy-top:#9ff7ff;--anatomy-shade-0:#1297ab;--anatomy-shade-1:#17a8bd;--anatomy-shade-2:#1db9ce;--anatomy-shade-3:#24c8dd;--anatomy-hi:#0c6070;--anatomy-lo:#0f7587;--anatomy-faint:#16899c",
  "v-cit": "--anatomy-paper:#e0b84a;--anatomy-top:#fff0b4;--anatomy-shade-0:#a98622;--anatomy-shade-1:#bb9631;--anatomy-shade-2:#cda741;--anatomy-shade-3:#dfb84f;--anatomy-hi:#7a5f12;--anatomy-lo:#8c6f17;--anatomy-faint:#a5842a",
};

let planNow = null;
let lastOrder = [];
const statics = [...world.children].filter((n) => n.id && n.id.startsWith("a-"));
statics.forEach((n) => { n.__key = parseFloat(n.dataset.key); });

function tokenView(t, G) {
  const s0 = t.segs[0].t0;
  if (G < s0) return null;
  let o = 1;
  if (t.fadeIn) o = sm((G - t.fadeIn[0]) / (t.fadeIn[1] - t.fadeIn[0]));
  if (t.fadeOut) { if (G >= t.fadeOut[1]) return null; o *= 1 - sm((G - t.fadeOut[0]) / (t.fadeOut[1] - t.fadeOut[0])); }
  if (o <= 0.004) return null;
  const p = posAt(t.segs, G);
  let tint = 0, tcls = null;
  if (t.tint) { tint = sm((G - t.tint.t0) / (t.tint.t1 - t.tint.t0)); tcls = t.tint.cls; }
  if (t.tint2) { const v = sm((G - t.tint2.t0) / (t.tint2.t1 - t.tint2.t0)); if (v > 0) { tint = v; tcls = t.tint2.cls; } }
  return { p, o, tint, tcls };
}
const HREF = { lot: "#lot", card: "#card", chip: "#chip" };
function drawTokens(pl, G) {
  let n = 0;
  const dyn = [];
  for (const t of pl.tokens) {
    const v = tokenView(t, G);
    if (!v) continue;
    const e = useOf(n++);
    const [dx, dy] = proj(v.p[0], v.p[1], v.p[2]);
    e.g.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    e.g.style.display = "";
    e.g.style.opacity = v.o >= 0.999 ? "" : v.o.toFixed(3);
    const href = HREF[t.kind];
    if (e.u.getAttribute("href") !== href) { e.u.setAttribute("href", href); e.t.setAttribute("href", href); }
    e.u.style.cssText = VARS[t.cls];
    if (v.tint > 0.002) { e.t.style.cssText = VARS[v.tcls] + `;opacity:${v.tint.toFixed(3)}`; e.t.style.display = ""; }
    else e.t.style.display = "none";
    e.key = depthOf([v.p[0], v.p[1], v.p[2] + 0.6], PJ);
    dyn.push(e.g); e.g.__key = e.key;
  }
  for (let i = n; i < pool.length; i++) if (pool[i]) { pool[i].g.style.display = "none"; }
  return dyn;
}
function reorder(dyn, extra) {
  const all = statics.concat(dyn, extra);
  all.sort((a, b) => a.__key - b.__key);
  let ref = world.firstChild;
  for (const n of all) {
    if (n === ref) ref = ref.nextSibling;
    else world.insertBefore(n, ref);
  }
}

// ---- partes dinâmicas fixas do desenho
const $c = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k2 in attrs) e.setAttribute(k2, attrs[k2]); if (parent) parent.appendChild(e); return e; };
const Zc = ZB + 0.2;
// cleats das esteiras
const cleatG = $c("g", { id: "cleats" });
svg.insertBefore(cleatG, $("#world", svg));
const beltDefs = [["A", WORLD.BELT_A], ["B", WORLD.BELT_B], ["C", WORLD.BELT_C], ["D", WORLD.BELT_D], ["E", WORLD.BELT_E]];
const cleatEls = {};
for (const [id] of beltDefs) cleatEls[id] = $c("path", { class: "iso-line", "data-tone": "lo", d: "" }, cleatG);
const beltRate = { A: 95, B: 70, C: 70, D: 70, E: 70 };
function beltPhase(pl, id, G) {
  // fase = integral da velocidade: sobe suave antes da primeira ficha e desce depois da última
  const [w0, w1] = pl.belts[id][0];
  const a = 0.35;
  const s = (t) => sm((t - (w0 - a)) / a) * (1 - sm((t - w1) / a));
  const n = 400, T = Math.max(0, Math.min(G, w1 + a + 0.01));
  let sum = 0;
  const t0 = w0 - a;
  if (T <= t0) return 0;
  const h = (T - t0) / n;
  for (let i = 0; i < n; i++) sum += s(t0 + (i + 0.5) * h) * h;
  return sum * beltRate[id];
}
const mod = (v, p) => ((v % p) + p) % p;
function drawCleats(pl, G) {
  for (const [id, [x0, x1]] of beltDefs) {
    const ph = beltPhase(pl, id, G);
    let d = "";
    const pitch = 14;
    for (let x = x0 + mod(ph, pitch) - pitch; x <= x1; x += pitch) {
      if (x < x0 + 3 || x > x1 - 3) continue;
      d += lineOnTop([x, -WORLD.BELT_W + 1.2], [x, WORLD.BELT_W - 1.2], ZB + 0.02, PJ);
    }
    cleatEls[id].setAttribute("d", d);
  }
}

// ---- deck vibrante: o grupo estático "deck" treme com a malha
const deckG = $("#deck", svg);
const towerG = {};
const lampEls = [...svg.querySelectorAll("#a-tower .lamp-on")];
// níveis nos tanques (barras de nível)
const levelEls = WORLD.DRUM.xs.map((x) => $c("g", {}, $("#a-drum" + WORLD.DRUM.xs.indexOf(x), svg)));
function drawLevels(pl, G) {
  WORLD.DRUM.xs.forEach((x, i) => {
    const f = 1 - fr(pl.ev.drum[i], G, 0.5);
    const d = WORLD.DRUM;
    const px = x + d.r * cam.cosA * 0.98, py = d.y + d.r * cam.sinA * 0.98;
    const hMax = 22;
    const base = d.z + 6;
    const frame = solidSvg(slabOf({ x: px - 1.9, y: py - 1.9, w: 3.8, d: 3.8, r: 0.5 }, base - 0.6, hMax + 1.2, PJ, 2), { tone: "lo", crease: "faint" });
    const fill = f > 0.004 ? solidSvg(slabOf({ x: px - 1.1, y: py - 1.1, w: 2.2, d: 2.2, r: 0.3 }, base, Math.max(0.3, hMax * f), PJ, 2), { tone: "hi", lit: true, crease: "none" }) : "";
    levelEls[i].innerHTML = frame + fill;
  });
}

// ---- jatos de ar e faixa do scanner
const fxG = $c("g", { id: "fx" });
svg.insertBefore(fxG, $("#world", svg).nextSibling);
const jetEls = {};
function pulse(times, G, w = 0.16) { let v = 0; for (const t of times) { const u = (G - t) / w; if (u > -1 && u < 1) v = Math.max(v, Math.cos(u * Math.PI / 2) ** 2); } return v; }
function drawFx(pl, G) {
  const parts = [];
  const scanLine = (x, lvl) => {
    const a = lineOnTop([x, -WORLD.BELT_W], [x, WORLD.BELT_W], ZB + 0.6, PJ);
    return `<path class="iso-line" data-tone="lit" d="${a}" style="stroke-width:${(0.8 + lvl * 1.4).toFixed(2)};opacity:${(0.25 + 0.75 * lvl).toFixed(3)}"/>`;
  };
  const run = (id) => { const [a, b] = pl.belts[id][0]; return sm((G - a) / 0.3) * (1 - sm((G - b) / 0.3)); };
  const sB = Math.max(pulse(pl.scans2, G, 0.14), run("B") * 0.15);
  const sD = Math.max(pulse(pl.scans4, G, 0.07), run("D") * 0.15);
  parts.push(scanLine(WORLD.GANTRY_B, sB), scanLine(WORLD.GANTRY_D, sD));
  const jet = (x, v, n) => {
    if (v < 0.02) return "";
    let d = "";
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 1.6;
      const len = 11 + 5 * v;
      d += segment([x + off, -WORLD.BELT_W - 3, 40.4], [x + off, -WORLD.BELT_W - 3 + len, 39.6], PJ);
    }
    return `<path class="iso-line" data-tone="lit" d="${d}" style="stroke-width:1.1;opacity:${v.toFixed(3)}"/>`;
  };
  parts.push(jet(WORLD.JET_B, pulse(pl.kicks, G, 0.22), 3));
  parts.push(jet(WORLD.JET_D, pulse(pl.ev.exc.map((t) => t - 0.3), G, 0.14), 3));
  // coletor de jatos da peneira: sopra o monte inteiro para o cesto
  const [j0, j1] = pl.jets.dump;
  const jv = sm((G - j0) / 0.25) * (1 - sm((G - j1) / 0.25));
  if (jv > 0.02) {
    let d = "";
    for (let i = 0; i < 6; i++) {
      const y0 = -13 - 0, x = 279 + i * 4.8;
      d += segment([x, -15, 41], [x, -15 + 12 + 6 * jv, 40], PJ);
    }
    parts.push(`<path class="iso-line" data-tone="lit" d="${d}" style="stroke-width:1.1;opacity:${jv.toFixed(3)}"/>`);
  }
  fxG.innerHTML = parts.join("");
}

// ---- prensa
const pressG = $c("g", { id: "pressdyn" });
function drawPress(pl, G, key2) {
  // placa desce a cada 3 fichas (carimbo)
  const x = PRESS.x;
  let h = 0;
  for (const t of pl.stamps) { const u = (G - (t - 0.1)) / 0.2; if (u > -1 && u < 1) h = Math.max(h, Math.cos(u * Math.PI / 2) ** 2); }
  const run = pl.stamps.length ? sm((G - (pl.stamps[0] - 0.3)) / 0.3) * (1 - sm((G - (pl.stamps[pl.stamps.length - 1] + 0.3)) / 0.3)) : 0;
  h *= run;
  const zp = 52 - 11.5 * h;
  const rod = solidSvg(cylinder(x, 0, 2.6, zp + 2.4, PRESS.zBar - zp - 2.4, PJ, 14), { tone: "mid", crease: "faint" });
  const plate = solidSvg(slabOf({ x: x - 4.6, y: -9, w: 9.2, d: 18, r: 1 }, zp, 2.4, PJ, 3, 0.3), { tone: "hi", lit: true });
  pressG.innerHTML = rod + plate;
  pressG.__key = key2;
}
pressG.id = "pressdyn";
world.appendChild(pressG);

// ---- painel do ASReview (desenhado no plano da parede)
const panelG = $("#panel", svg);
const PL = (() => { const o = iso([PANEL.x, PANEL.y + 3.2, PANEL.zTop], PJ); const ux = iso([PANEL.x + 1, PANEL.y + 3.2, PANEL.zTop], PJ); const dz = iso([PANEL.x, PANEL.y + 3.2, PANEL.zTop - 1], PJ); return `matrix(${ux[0] - o[0]} ${ux[1] - o[1]} ${dz[0] - o[0]} ${dz[1] - o[1]} ${o[0]} ${o[1]})`; })();
const pg = $c("g", { transform: PL }, panelG);
const PW = PANEL.w, PH = PANEL.h;
$c("rect", { x: 0, y: 0, width: PW, height: PH, fill: "#06101f" }, pg);
const cells = [];
const NC = 84, CC = 28, RC = 3;
const cw = (PW - 8) / CC, ch = 3.2;
for (let i = 0; i < NC; i++) cells.push($c("rect", { x: 4 + (i % CC) * cw + 0.3, y: 16.6 + Math.floor(i / CC) * (ch + 0.7), width: cw - 0.6, height: ch, rx: 0.5, fill: "#112847" }, pg));
const txt = (x, y, size, anchor, fill, weight = 500, fam = "Geist, system-ui, sans-serif") => { const e = $c("text", { x, y, "font-size": size, "text-anchor": anchor, fill, "font-weight": weight, "font-family": fam }, pg); return e; };
txt(4, 8.4, 6.4, "start", "#8fd8f0", 600).textContent = "ASReview · aprendendo";
const pLearn = $c("circle", { cx: PW - 6, cy: 6, r: 1.8, fill: "#5cf0ff" }, pg);
const pLabelStrip = txt(4, 14.4, 4.2, "start", "#7fa2c2"); pLabelStrip.textContent = "cada quadrado: 10 lidos · ciano: relevantes";
// Linhas com folga de ~3 unidades entre texto e barra: a tela fica inclinada no plano
// da parede, e o que é apertado em 2D encavala na vista isométrica.
txt(4, 34.6, 4.6, "start", "#a9bdd3").textContent = "irrelevantes seguidos";
const pRun = txt(PW - 4, 34.6, 5.2, "end", "#e6f4ff", 600, "'Geist Mono', ui-monospace, monospace");
$c("rect", { x: 4, y: 37.6, width: PW - 8, height: 6.2, rx: 1.4, fill: "#0c1d36", stroke: "#2c5176", "stroke-width": 0.3 }, pg);
const pBar = $c("rect", { x: 4, y: 37.6, width: 0, height: 6.2, rx: 1.4, fill: "#38e1f5" }, pg);
txt(4, 50.6, 4.6, "start", "#a9bdd3").textContent = "relevantes";
$c("rect", { x: 4, y: 53.6, width: PW - 8, height: 11.4, rx: 1, fill: "#0a1830", stroke: "#1b3558", "stroke-width": 0.3 }, pg);
const pCurve = $c("path", { d: "", fill: "none", stroke: "#38e1f5", "stroke-width": 0.8, "stroke-linejoin": "round" }, pg);
const pRelTxt = txt(PW - 4, 50.6, 4.8, "end", "#e6f4ff", 600, "'Geist Mono', ui-monospace, monospace");
const pStop = txt(PW / 2, 42.2, 4.2, "middle", "#1b1203", 700); pStop.textContent = "REGRA DE PARADA ATINGIDA"; pStop.setAttribute("opacity", "0");
const pLabel2 = txt(4, 14.4, 4.2, "start", "#ffcf85"); pLabel2.textContent = "aprendeu: o resto da fila nem foi lido"; pLabel2.setAttribute("opacity", "0");
// ---- cabeças (mostradores) e etiquetas dos cestos
const headG = $("#heads", svg);
const headEls = {};
for (const h of HEADS) {
  const g = $c("g", { class: "head", "data-head": h.id }, headG);
  const ends = h.anchors || [[h.ax, h.ay]];
  ends.forEach(([ex, ey], i) => {
    const y0 = h.rows ? h.sy + 56 + i * 10.6 : h.sy + h.h;
    const x0 = h.rows ? h.sx + h.w / 2 : h.sx;
    $c("line", { x1: x0, y1: y0, x2: ex, y2: ey, class: "stalk" }, g);
    $c("circle", { cx: ex, cy: ey, r: 1.6, class: "stalk-dot" }, g);
  });
  const plate = $c("rect", { x: h.sx - h.w / 2, y: h.sy, width: h.w, height: h.h, rx: 4, class: "plate" }, g);
  const name = $c("text", { x: h.sx - h.w / 2 + 7, y: h.sy + 12, class: "h-name" }, g); name.textContent = h.name;
  const val = $c("text", { x: h.sx - h.w / 2 + 7, y: h.sy + 31, class: "h-val" }, g);
  const sub = $c("text", { x: h.sx - h.w / 2 + 7, y: h.sy + (h.rows ? 45 : h.h - 6), class: "h-sub" }, g);
  const rows = (h.rows || []).map((nm, i) => {
    const y = h.sy + 60 + i * 10.6;
    const a1 = $c("text", { x: h.sx - h.w / 2 + 7, y, class: "h-row" }, g); a1.textContent = nm;
    const a2 = $c("text", { x: h.sx + h.w / 2 - 7, y, class: "h-row n", "text-anchor": "end" }, g);
    return a2;
  });
  headEls[h.id] = { g, val, sub, rows, plate };
}
const setT = (el, s) => { if (el.__s !== s) { el.textContent = s; el.__s = s; } };

// ---------------------------------------------------------------- fluxograma
const FW = 372, FH = 498;
const flowSvg = $("#flow");
const FB = {};
const flowDefs = [
  { id: "ident", x: 4, y: 6, w: 170, h: 120, title: "Identificação", at: (pl) => pl.T0[0] + 0.6 },
  { id: "dups", x: 182, y: 6, w: 186, h: 54, title: "Removidos antes da triagem", at: (pl) => pl.T0[1] + 0.3 },
  { id: "triados", x: 4, y: 160, w: 170, h: 46, title: "Triagem", at: (pl) => pl.T0[1] + pl.D[1] },
  { id: "exc", x: 182, y: 142, w: 186, h: 86, title: "Registros excluídos", at: (pl) => pl.T0[2] + 0.4 },
  { id: "busc", x: 4, y: 262, w: 170, h: 46, title: "Relatórios buscados", at: (pl) => pl.tS + 0.2 },
  { id: "cit", x: 182, y: 262, w: 186, h: 46, title: "Outros métodos", at: (pl) => pl.T0[0] + 1.2 },
  { id: "aval", x: 4, y: 344, w: 170, h: 46, title: "Elegibilidade", at: (pl) => pl.T0[3] + 0.4 },
  { id: "exct", x: 182, y: 336, w: 186, h: 62, title: "Relatórios excluídos", at: (pl) => pl.T0[3] + 1 },
  { id: "inc", x: 4, y: 436, w: 170, h: 54, title: "Incluídos", at: (pl) => pl.T0[4] + 0.4 },
];
const arrows = [["ident", "triados", "v"], ["ident", "dups", "h"], ["triados", "exc", "h"], ["triados", "busc", "v"], ["busc", "aval", "v"], ["cit", "aval", "d"], ["aval", "exct", "h"], ["aval", "inc", "v"]];
function mountFlow() {
  flowSvg.innerHTML = `<defs><marker id="fa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#4c86aa"/></marker></defs>`;
  flowSvg.setAttribute("viewBox", `0 0 ${FW} ${FH}`);
  const mk2 = (tag, a, p) => { const e = document.createElementNS(SVGNS, tag); for (const k2 in a) e.setAttribute(k2, a[k2]); (p || flowSvg).appendChild(e); return e; };
  FB.arrows = [];
  for (const [a, b, kind] of arrows) {
    const A = flowDefs.find((f) => f.id === a), Bx = flowDefs.find((f) => f.id === b);
    let d;
    if (kind === "v") d = `M${A.x + A.w / 2} ${A.y + A.h} V${Bx.y - 1}`;
    else if (kind === "h") d = `M${A.x + A.w} ${Bx.y + Bx.h / 2} H${Bx.x - 1}`;
    else d = `M${A.x + A.w / 2} ${A.y + A.h} V${A.y + A.h + 14} H${Bx.x + Bx.w - 24} V${Bx.y - 1}`;
    FB.arrows.push({ a, b, el: mk2("path", { d, class: "f-arrow", "marker-end": "url(#fa)" }) });
  }
  for (const f of flowDefs) {
    const g = mk2("g", { class: "f-box", "data-id": f.id });
    mk2("rect", { x: f.x, y: f.y, width: f.w, height: f.h, rx: 4, class: "f-rect" }, g);
    const solid = mk2("rect", { x: f.x, y: f.y, width: f.w, height: f.h, rx: 4, class: "f-solid" }, g);
    const t = mk2("text", { x: f.x + 9, y: f.y + 14, class: "f-title" }, g); t.textContent = f.title;
    const n = f.id === "ident" ? 7 : f.id === "exc" ? 4 : f.id === "exct" ? 2 : 2;
    const lines = [];
    for (let i = 0; i < n; i++) lines.push({ l: mk2("text", { x: f.x + 9, y: f.y + 29 + i * 13.2, class: "f-line" }, g), v: mk2("text", { x: f.x + f.w - 9, y: f.y + 29 + i * 13.2, class: "f-num", "text-anchor": "end" }, g) });
    FB[f.id] = { g, f, lines, solid };
  }
}
function fillBox(id, rows, appear) {
  const b = FB[id];
  b.g.style.opacity = (0.3 + 0.7 * appear).toFixed(3);
  b.solid.style.opacity = appear.toFixed(3);
  b.lines.forEach((ln, i) => {
    const r = rows[i];
    setT(ln.l, r ? r[0] : "");
    setT(ln.v, r ? r[1] : "");
  });
}
const PEND = "—";
function drawFlow(pl, G, R) {
  const m = pl.m;
  const a = (id) => sm((G - flowDefs.find((f) => f.id === id).at(pl)) / 0.5);
  const done = (i) => G >= pl.T0[i] + pl.D[i] - 1e-6;
  const started = (i) => G > pl.T0[i];
  const n = (cond, v) => (cond ? "n = " + fmt(v) : "n = " + PEND);
  fillBox("ident", [["Bases de dados", n(started(0), R.ident)], ...m.bases.map((b, i) => ["   " + b.nome, started(0) ? fmt(R.porBase[i]) : ""]), ["divisão por base ilustrativa", ""]], a("ident"));
  fillBox("dups", [["Duplicatas", n(started(1), R.dup)], ["por DOI e título", ""]], a("dups"));
  fillBox("triados", [["Registros triados", n(done(1), m.unicos)]], a("triados"));
  fillBox("exc", [["Total excluídos", n(started(2), R.exclTriagem)], ["sem leitura (regra parada)", started(2) ? fmt(R.tail) : ""], ["desenho não experimental", started(2) ? fmt(R.excTit) : ""], ["população não gestante", started(2) ? fmt(R.exc2) : ""]], a("exc"));
  fillBox("busc", [["Relatórios buscados", n(started(2), R.seguem)], ["não obtidos", String(m.naoObtidos)]], a("busc"));
  fillBox("cit", [["Busca de citações", n(R.cit > 0, R.cit)], ["segue à elegibilidade", ""]], a("cit"));
  fillBox("aval", [["Relatórios avaliados", n(started(3), R.aval)]], a("aval"));
  fillBox("exct", [["Total excluídos", n(started(3), R.excT)], ["desfecho de interesse ausente", started(3) ? fmt(R.excT) : ""]], a("exct"));
  fillBox("inc", [["Estudos incluídos", n(started(4), R.inc)]], a("inc"));
  for (const ar of FB.arrows) {
    const v = Math.min(sm((G - flowDefs.find((f) => f.id === ar.a).at(pl)) / 0.5), a(ar.b));
    ar.el.style.opacity = (0.15 + 0.85 * v).toFixed(3);
  }
}

// ---------------------------------------------------------------- cabeças e etiquetas
const tagG = $c("g", { id: "tags" }, headG);
const tagDefs = __TAGS__;
const tagEls = tagDefs.map((t) => {
  const g = $c("g", { class: "tag" }, tagG);
  $c("line", { x1: t.ax, y1: t.ay, x2: t.tx, y2: t.ty, class: "stalk" }, g);
  $c("circle", { cx: t.ax, cy: t.ay, r: 1.5, class: "stalk-dot" }, g);
  const plate = $c("rect", { x: t.sx, y: t.sy, width: t.w, height: 38, rx: 3.5, class: "plate" }, g);
  const v = $c("text", { x: t.sx + 6, y: t.sy + 14, class: "h-val sm" }, g);
  t.label.forEach((ln, i) => { const r = $c("text", { x: t.sx + 6, y: t.sy + 24.5 + i * 8.4, class: "h-name tg" }, g); r.textContent = ln; });
  return { g, v, t, plate };
});
const tagVal = (R, id) => ({ cit: R.cit, dup: R.dup, desenho: R.excTit, parada: R.tail, segunda: R.exc2, desfecho: R.excT })[id];

const mixc = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const rgb = (c) => `rgb(${c.map(Math.round).join(",")})`;
const C_PEND = [89, 117, 154], C_LIVE = [92, 240, 255], C_DONE = [234, 247, 255];
const S_PEND = [44, 95, 134], S_LIVE = [56, 225, 245];
function tone(el, plate, G, t0, t1) {
  const live = sm((G - t0) / 0.4), done = sm((G - t1) / 0.5);
  el.style.fill = rgb(mixc(mixc(C_PEND, C_LIVE, live), C_DONE, done));
  plate.style.stroke = rgb(mixc(mixc(S_PEND, S_LIVE, live), S_PEND, done));
}
function drawHeads(pl, G, R) {
  const m = pl.m;
  const st = (i) => (G >= pl.T0[i] + pl.D[i] ? "done" : G > pl.T0[i] ? "live" : "pend");
  const set = (id, val, sub, a, b) => { const h = headEls[id]; setT(h.val, val); setT(h.sub, sub); tone(h.val, h.plate, G, pl.T0[a], pl.T0[b] + pl.D[b]); };
  // Antes do passo rodar, a placa mostra "—": a máquina não entrega a resposta antes da hora.
  const ou = (i, v) => (st(i) === "pend" ? PEND : fmt(v));
  set("A", ou(0, R.ident), "+ " + ou(0, R.cit) + " por citações", 0, 0);
  headEls.A.rows.forEach((el, i) => setT(el, ou(0, R.porBase[i])));
  set("B", ou(1, R.dup), "únicos: " + (st(1) === "done" ? fmt(m.unicos) : PEND), 1, 1);
  set("C", (st(2) === "pend" ? PEND : lerHoras(R.horas)) + " h", "sem ASReview: " + lerHoras(m.horasSemAprendizado) + " h", 2, 3);
  set("D", ou(3, R.excT), "avaliados: " + ou(3, R.aval), 3, 3);
  set("E", ou(4, R.inc), "estudos incluídos", 4, 4);
  tagEls.forEach(({ v, t, plate }) => {
    const stp = { cit: 0, dup: 1, desenho: 2, parada: 2, segunda: 2, desfecho: 3 }[t.id];
    setT(v, ou(stp, tagVal(R, t.id)));
    tone(v, plate, G, pl.T0[stp], pl.T0[stp] + pl.D[stp]);
  });
}
function drawPanel(pl, G, R) {
  const m = pl.m;
  const lidosBuckets = Math.floor(R.lidos / 10);
  const rastro = pl.rastro;
  for (let i = 0; i < NC; i++) {
    const lo = i * 10, hi = lo + 10;
    let fill = "#112847";
    if (R.lidos > lo) {
      const upto = Math.min(hi, R.lidos);
      let c = 0; for (let j = lo; j < upto; j++) c += rastro[j];
      const part = (upto - lo) / 10;
      const inten = c / Math.max(1, upto - lo);
      const r0 = 28, g0 = 52, b0 = 82, r1 = 56, g1 = 225, b1 = 245;
      const u = Math.min(1, inten * 1.6);
      fill = `rgb(${Math.round(lerp(r0, r1, u))},${Math.round(lerp(g0, g1, u))},${Math.round(lerp(b0, b1, u))})`;
      if (part < 1) fill = `rgb(${Math.round(lerp(17, r0, part))},${Math.round(lerp(40, g0, part))},${Math.round(lerp(71, b0, part))})`;
    }
    if (cells[i].__f !== fill) { cells[i].setAttribute("fill", fill); cells[i].__f = fill; }
  }
  const learn = G > pl.T0[2] && R.lidos < m.lidos ? 0.5 + 0.5 * Math.sin(G * 18) : 0.25;
  pLearn.setAttribute("opacity", learn.toFixed(2));
  const f = clamp(R.seguidos / m.regra, 0, 1);
  pBar.setAttribute("width", ((PW - 8) * f).toFixed(2));
  const sp = sm((G - pl.tStop) / 0.4);
  pBar.setAttribute("fill", rgb(mixc([56, 225, 245], [255, 184, 77], sp)));
  pStop.setAttribute("opacity", sp.toFixed(3));
  pLabel2.setAttribute("opacity", sp.toFixed(3));
  pLabelStrip.setAttribute("opacity", (1 - sp).toFixed(3));
  setT(pRun, R.seguidos + " / " + m.regra);
  setT(pRelTxt, R.relevantes + " de " + R.lidos + " lidos");
  // curva: relevantes encontrados × lidos
  if (R.lidos !== pCurve.__n) {
    pCurve.__n = R.lidos;
    const step = Math.max(1, Math.floor(R.lidos / 60));
    let d = "";
    for (let i = 0; i <= R.lidos; i += step) {
      const x = 4 + ((PW - 8) * i) / m.lidos;
      const y = 64.2 - (10.2 * pl.cum.rel[i]) / m.segundaLeitura;
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }
    const x = 4 + ((PW - 8) * R.lidos) / m.lidos, y = 64.2 - (10.2 * R.relevantes) / m.segundaLeitura;
    d += "L" + x.toFixed(2) + " " + y.toFixed(2);
    pCurve.setAttribute("d", d);
  }
}
function drawTower(pl, G) {
  const run = sm((G - pl.T0[2]) / 0.4);
  const stop = sm((G - pl.tStop) / 0.4);
  if (lampEls[0]) lampEls[0].style.opacity = stop.toFixed(3);
  if (lampEls[1]) lampEls[1].style.opacity = (run * (1 - stop)).toFixed(3);
}

// ---------------------------------------------------------------- tremor da peneira
function shake(pl, G) {
  const a = sm((G - pl.T0[2]) / 0.5) * (1 - sm((G - (pl.tStop + 0.1)) / 0.7));
  const dx = a * 0.35 * Math.sin(G * 83) , dy = a * 0.25 * Math.sin(G * 71 + 1);
  const [sx, sy] = proj(dx, dy, a * 0.18 * Math.sin(G * 97));
  deckG.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
}
// satélite: bolsa de citações (luz)
const satLed = $c("g", {}, $("#a-satchel", svg));
function drawSat(pl, G) {
  const on = sm((G - pl.ev.cit[0] - pl.T0[0]) / 0.4);
  const { x, y } = WORLD.SAT;
  satLed.innerHTML = on > 0.02 ? `<g style="opacity:${on.toFixed(3)}">${solidSvg(cylinder(x, y, 2.2, 58.4, 1.6, PJ, 12), { tone: "hi", lit: true })}</g>` : "";
}

// ---------------------------------------------------------------- render completo
function render(G) {
  const pl = planNow;
  const R = readouts(pl, G);
  const dyn = drawTokens(pl, G);
  drawCleats(pl, G);
  drawLevels(pl, G);
  drawFx(pl, G);
  drawPress(pl, G, depthOf([PRESS.x, 0, 50], PJ));
  drawSat(pl, G);
  shake(pl, G);
  drawPanel(pl, G, R);
  drawHeads(pl, G, R);
  drawTower(pl, G);
  drawFlow(pl, G, R);
  pressG.__key = depthOf([PRESS.x, 0, 46], PJ);
  const lampKey = [];
  reorder(dyn, [pressG]);
  return R;
}

// ---------------------------------------------------------------- controle
const state = { G: 0, run: null, mode: "manual", sens: 0.5, running: false, last: 0, pause: 0 };
const els = {
  steps: [...document.querySelectorAll("[data-step]")],
  modeBtns: [...document.querySelectorAll("[data-mode]")],
  tip: $("#dica"),
  restart: $("#recomecar"),
  slider: $("#sens"),
  sensOut: $("#sensOut"),
  sensHint: $("#sensHint"),
  readout: document.querySelector("[data-readout]"),
};
const TIPS = [
  "Buscar: cinco bases respondem à mesma pergunta. Cada ficha que desce pela esteira é um lote de registros.",
  "Deduplicar: o mesmo artigo aparece em mais de uma base. Fica um só; o repetido sai com o motivo anotado.",
  "Triar título e resumo: o ASReview aprende com cada decisão e põe os mais prováveis na frente. Quando muitos seguidos não servem, a máquina para.",
  "Ler texto completo: agora o artigo inteiro. Quem não serve sai da máquina com um motivo por escrito.",
  "Incluir: o que sobrou são os estudos da revisão. A conta do fluxograma fecha.",
];
const stepOf = (G) => { for (let i = 4; i >= 0; i--) if (G > planNow.T0[i]) return i; return -1; };
const doneCount = (G) => { let n = 0; for (let i = 0; i < 5; i++) if (G >= planNow.T0[i] + planNow.D[i] - 1e-6) n++; return n; };
function setSteps(G) {
  const done = doneCount(G);
  const act = stepOf(G);
  const running = state.running;
  els.steps.forEach((b, i) => {
    const status = i < done ? "done" : (running && i === act) ? "active" : i === done ? "next" : "todo";
    b.dataset.status = status;
    b.disabled = !(state.mode === "manual" && !running && i === done);
    b.setAttribute("aria-current", status === "next" || status === "active" ? "step" : "false");
  });
  const tipIdx = running ? act : Math.min(done, 4);
  const prefix = done === 5 && !running ? "Pronto. " : "";
  setT(els.tip, done === 5 && !running ? "Pronto: a máquina entregou os estudos incluídos, e cada registro que saiu tem um motivo anotado." : TIPS[tipIdx]);
  const s = running ? `passo ${act + 1} de 5 · ${NAMES[act]}` : done === 5 ? "concluído · fluxograma fechado" : `pronto para o passo ${done + 1} · ${NAMES[done]}`;
  setT(els.readout, s);
  document.body.dataset.done = String(done);
}
function frame(now) {
  state.raf = 0;
  const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0;
  state.last = now;
  if (state.running) {
    state.G = Math.min(state.G + dt, state.until);
    if (state.G >= state.until) {
      state.running = false;
      if (state.mode === "auto" && doneCount(state.G) < 5) { state.pause = 0.9; }
    }
  } else if (state.pause > 0) {
    state.pause -= dt;
    if (state.pause <= 0) startNext();
  }
  render(state.G);
  setSteps(state.G);
  if (state.running || state.pause > 0 || state.dirty) { state.dirty = false; state.raf = requestAnimationFrame(frame); } else state.last = 0;
}
const kick = () => { if (!state.raf) { state.last = 0; state.raf = requestAnimationFrame(frame); } };
function startStep(i) {
  const pl = planNow;
  state.G = pl.T0[i];
  state.until = state.mode === "auto" ? pl.T0[i] + pl.D[i] : pl.T0[i] + pl.D[i];
  state.running = true;
  kick();
}
function startNext() {
  const d = doneCount(state.G);
  if (d < 5) startStep(d);
}
function reset(keepAuto = true) {
  state.G = 0; state.running = false; state.pause = 0;
  render(0); setSteps(0);
  if (state.mode === "auto" && keepAuto) { state.pause = 0.6; }
  kick();
}
function rebuild() {
  const m = modelo({ sensibilidade: state.sens });
  planNow = plan(m);
  planNow.rastro = trilha(m);
  mountFlow();
}
els.steps.forEach((b, i) => b.addEventListener("click", () => { if (state.mode === "manual" && !state.running && doneCount(state.G) === i) startStep(i); }));
els.modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
function setMode(mode) {
  state.mode = mode;
  try { localStorage.setItem("prisma-maquina-modo", mode); } catch (e) {}
  els.modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  document.body.dataset.mode = mode;
  if (mode === "auto" && !state.running && doneCount(state.G) < 5) state.pause = 0.5;
  kick();
}
els.restart.addEventListener("click", (e) => { e.preventDefault(); reset(); });
function sensLabel() {
  const f = fator(state.sens);
  els.sensOut.textContent = "×" + f.toFixed(2).replace(".", ",");
  const dito = Math.abs(state.sens - 0.5) < 0.005 ? "como no estudo publicado" : state.sens > 0.5 ? "busca mais ampla: mais registros para triar" : "busca mais estreita: menos registros, mais risco de perder estudos";
  // As placas só mostram números depois que o passo roda; a projeção fica aqui, no próprio slider.
  const p = modelo({ sensibilidade: state.sens });
  els.sensHint.textContent = `${dito} · ${fmt(p.total)} registros, ${lerHoras(p.horas)} h de triagem`;
}
let sensTimer = 0;
els.slider.addEventListener("input", () => {
  state.sens = parseFloat(els.slider.value);
  sensLabel();
  clearTimeout(sensTimer);
  sensTimer = setTimeout(() => { rebuild(); reset(); }, 120);
});
sensLabel();

// ganchos para teste: avançam o relógio sem RAF
window.__prisma = {
  seek(G) { state.pause = 0; state.G = G; const a = stepOf(G); state.running = a >= 0 && G < planNow.T0[a] + planNow.D[a] - 1e-6; render(G); setSteps(G); },
  get plan() { return planNow; },
  setSens(s) { state.sens = s; els.slider.value = String(s); sensLabel(); rebuild(); },
  setMode,
  state,
  startStep,
  render,
};
rebuild();
let saved = "manual";
try { saved = localStorage.getItem("prisma-maquina-modo") || "manual"; } catch (e) {}
setMode(saved === "auto" ? "auto" : "manual");
render(0); setSteps(0);
if (state.mode === "auto") state.pause = 0.6;
kick();
return window.__prisma;
})();
