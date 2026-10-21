import test from "node:test";
import assert from "node:assert/strict";
import { modelo, somaFluxograma, trilha, triagem, REAL, BASES, reparte } from "./model.mjs";

test("sensibilidade padrão reproduz o fluxograma publicado", () => {
  const m = modelo();
  assert.equal(m.total, REAL.identificados);
  assert.equal(m.duplicatas, REAL.duplicatas);
  assert.equal(m.unicos, REAL.unicos);
  assert.equal(m.regra, REAL.regra);
  assert.equal(m.lidos, REAL.lidos);
  assert.equal(m.naoVistos, REAL.naoVistos);
  assert.equal(m.excTitulo, REAL.excTitulo);
  assert.equal(m.segundaLeitura, REAL.segundaLeitura);
  assert.equal(m.excSegunda, REAL.excSegunda);
  assert.equal(m.buscados, REAL.buscados);
  assert.equal(m.avaliados, REAL.avaliados);
  assert.equal(m.excTexto, REAL.excTexto);
  assert.equal(m.incluidos, REAL.incluidos);
});

test("soma do fluxograma: identificados − duplicatas − excluídos de cada etapa = incluídos", () => {
  for (const s of [0, 0.1, 0.25, 0.5, 0.63, 0.8, 1]) {
    const m = modelo({ sensibilidade: s });
    const z = somaFluxograma(m);
    const pelaMao = m.total + m.citacoes - m.duplicatas - m.naoVistos - m.excTitulo - m.excSegunda - m.excTexto;
    assert.equal(pelaMao, m.incluidos, `sensibilidade ${s}`);
    assert.equal(z.resto, z.incluidos);
    assert.ok(z.fecha);
    // cada etapa fecha sozinha
    assert.equal(m.total - m.duplicatas, m.unicos);
    assert.equal(m.unicos - m.naoVistos - m.excTitulo - m.excSegunda, m.buscados);
    assert.equal(m.buscados + m.citacoes - m.naoObtidos - m.excTexto, m.incluidos);
    assert.equal(m.bases.reduce((a, b) => a + b.n, 0), m.total);
    assert.equal(m.motivos.reduce((a, x) => a + x.n, 0) + m.incluidos, m.total + m.citacoes);
  }
});

test("no caso real, a conta publicada fecha em 58", () => {
  const m = modelo();
  assert.equal(9045 + 1 - 4765 - 3450 - 638 - 119 - 16, 58);
  assert.equal(somaFluxograma(m).incluidos, 58);
});

test("mais sensibilidade traz mais registros e mais horas", () => {
  let antes = null;
  for (const s of [0, 0.25, 0.5, 0.75, 1]) {
    const m = modelo({ sensibilidade: s });
    if (antes) {
      assert.ok(m.total > antes.total);
      assert.ok(m.horas > antes.horas);
    }
    assert.ok(m.horas < m.horasSemAprendizado);
    assert.ok(m.lidos <= m.unicos);
    antes = m;
  }
});

test("a trilha tem os relevantes certos e para exatamente na regra", () => {
  for (const s of [0, 0.5, 1]) {
    const m = modelo({ sensibilidade: s });
    const r = trilha(m);
    assert.equal(r.length, m.lidos);
    assert.equal(r.reduce((a, b) => a + b, 0), m.segundaLeitura);
    let seg = 0, max = 0;
    for (let i = 0; i < r.length; i++) {
      seg = r[i] ? 0 : seg + 1;
      if (i < r.length - 1) max = Math.max(max, seg);
    }
    assert.ok(max < m.regra, "a regra não dispara antes da hora");
    assert.equal(seg, m.regra, "no fim, exatamente `regra` irrelevantes seguidos");
    const t = triagem(m, 0.6, r);
    assert.ok(t.parou && t.seguidos === m.regra && t.lidos === m.lidos);
  }
});

test("os contadores chegam aos totais do modelo", () => {
  const m = modelo();
  const t = triagem(m, 1);
  assert.equal(t.lidos, m.lidos);
  assert.equal(t.relevantes, m.segundaLeitura);
  assert.equal(t.excTitulo, m.excTitulo);
  assert.equal(t.naoVistosDespejados, m.naoVistos);
  assert.equal(t.excSegunda, m.excSegunda);
  assert.equal(t.seguem, m.buscados);
  let ant = -1;
  for (let p = 0; p <= 1.0001; p += 0.01) {
    const x = triagem(m, p);
    assert.ok(x.lidos >= ant);
    ant = x.lidos;
  }
});

test("reparte soma o total", () => {
  assert.deepEqual(reparte(9045, BASES.map((b) => b.peso)), [2610, 2380, 1780, 1520, 755]);
  assert.equal(reparte(101, [1, 1, 1]).reduce((a, b) => a + b), 101);
});
