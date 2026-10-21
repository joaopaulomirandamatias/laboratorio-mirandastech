// Modelo puro da máquina PRISMA. Nenhum DOM, nenhum relógio: tudo o que a tela
// mostra (registros por base, duplicatas, excluídos, incluídos, horas) sai daqui.
//
// FONTE dos números na sensibilidade padrão (0,5):
//   Barrera B, Ahmed F, Brand T, Zeeb H. Smoking cessation in pregnancy: a systematic
//   review and meta-analysis of vulnerability approaches and expectant father involvement.
//   Public Health Reviews, 2026;47. doi:10.3389/phrs.2026.1609825 (PMC13616806, CC BY).
//   Fluxograma PRISMA 2020 (Fig. 1) e texto "Study selection":
//   9.045 registros em 5 bases; 4.765 duplicatas; 4.280 únicos no ASReview; regra de parada
//   = 5% dos registros (214) irrelevantes seguidos, atingida após 830 lidos; 3.450 sem leitura
//   humana; 638 excluídos (desenho não experimental); 192 na 2ª leitura; 119 excluídos
//   (população não gestante); 73 + 1 (busca de citações) relatórios lidos; 16 excluídos
//   (desfecho de interesse ausente); 58 estudos incluídos.
//
// NÃO vêm da fonte (ilustrativos, marcados na tela): a divisão dos 9.045 registros entre as
// cinco bases (o artigo só publica o total), o tempo por registro e o efeito da sensibilidade.

export const FONTE = {
  curta: "Barrera et al., Public Health Reviews 2026, doi:10.3389/phrs.2026.1609825",
  doi: "10.3389/phrs.2026.1609825",
  url: "https://doi.org/10.3389/phrs.2026.1609825",
};

export const REAL = {
  identificados: 9045,
  duplicatas: 4765,
  unicos: 4280,
  regra: 214,
  lidos: 830,
  naoVistos: 3450,
  excTitulo: 638,
  segundaLeitura: 192,
  excSegunda: 119,
  buscados: 73,
  citacoes: 1,
  naoObtidos: 0,
  avaliados: 74,
  excTexto: 16,
  incluidos: 58,
};

// Divisão ilustrativa por base (soma = 9.045). O total é real; a divisão, não.
export const BASES = [
  { id: "medline", nome: "MEDLINE", peso: 2610 },
  { id: "scopus", nome: "Scopus", peso: 2380 },
  { id: "cinahl", nome: "CINAHL", peso: 1780 },
  { id: "psycinfo", nome: "PsycINFO", peso: 1520 },
  { id: "assia", nome: "ASSIA", peso: 755 },
];

export const TEMPO = { minTitulo: 0.5, minSegunda: 0.5, minTexto: 8 }; // ilustrativos

export const MOTIVOS = {
  duplicata: "duplicata",
  parada: "abaixo da regra de parada, sem leitura humana",
  desenho: "desenho não experimental",
  populacao: "população não gestante",
  desfecho: "desfecho de interesse ausente",
};

const SENS_PADRAO = 0.5;
export const fator = (sensibilidade) => 2 ** (2 * (sensibilidade - SENS_PADRAO)); // 0,5x a 2x

// Reparte `total` em partes inteiras proporcionais a `pesos` (maiores restos).
export function reparte(total, pesos) {
  const soma = pesos.reduce((a, b) => a + b, 0);
  const cru = pesos.map((p) => (total * p) / soma);
  const base = cru.map(Math.floor);
  let falta = total - base.reduce((a, b) => a + b, 0);
  const ordem = cru.map((c, i) => [c - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let i = 0; falta > 0; i++, falta--) base[ordem[i][1]]++;
  return base;
}

export function modelo({ sensibilidade = SENS_PADRAO } = {}) {
  const f = fator(sensibilidade);
  const total = Math.round(REAL.identificados * f);
  const porBase = reparte(total, BASES.map((b) => b.peso));
  const bases = BASES.map((b, i) => ({ id: b.id, nome: b.nome, n: porBase[i] }));
  const duplicatas = Math.round((total * REAL.duplicatas) / REAL.identificados);
  const unicos = total - duplicatas;
  const regra = Math.round(0.05 * unicos);
  const razao = unicos / REAL.unicos;
  const segundaLeitura = Math.round(REAL.segundaLeitura * razao ** 0.6); // relevantes após a 1ª leitura
  const ultimoRelevante = Math.round((REAL.lidos - REAL.regra) * razao ** 0.7); // posição (1-based) do último
  const lidos = ultimoRelevante + regra;
  const excTitulo = lidos - segundaLeitura;
  const naoVistos = unicos - lidos;
  const excSegunda = Math.round((segundaLeitura * REAL.excSegunda) / REAL.segundaLeitura);
  const buscados = segundaLeitura - excSegunda;
  const citacoes = REAL.citacoes;
  const naoObtidos = REAL.naoObtidos;
  const avaliados = buscados + citacoes - naoObtidos;
  const excTexto = Math.round((avaliados * REAL.excTexto) / REAL.avaliados);
  const incluidos = avaliados - excTexto;
  const minutos = lidos * TEMPO.minTitulo + segundaLeitura * TEMPO.minSegunda + avaliados * TEMPO.minTexto;
  const minutosSemAprendizado = unicos * TEMPO.minTitulo + segundaLeitura * TEMPO.minSegunda + avaliados * TEMPO.minTexto;
  return {
    sensibilidade, fator: f, total, bases, citacoes, duplicatas, unicos, regra, lidos, ultimoRelevante, excTitulo,
    naoVistos, segundaLeitura, excSegunda, buscados, naoObtidos, avaliados, excTexto, incluidos,
    horas: minutos / 60, horasSemAprendizado: minutosSemAprendizado / 60,
    motivos: [
      { etapa: "dedup", motivo: MOTIVOS.duplicata, n: duplicatas },
      { etapa: "triagem", motivo: MOTIVOS.parada, n: naoVistos },
      { etapa: "triagem", motivo: MOTIVOS.desenho, n: excTitulo },
      { etapa: "triagem", motivo: MOTIVOS.populacao, n: excSegunda },
      { etapa: "texto", motivo: MOTIVOS.desfecho, n: excTexto },
    ],
  };
}

// O fluxograma fecha? identificados (+ citações) − duplicatas − excluídos de cada etapa = incluídos.
export function somaFluxograma(m) {
  const identificados = m.total + m.citacoes;
  const excluidos = m.motivos.filter((x) => x.etapa !== "dedup").reduce((a, x) => a + x.n, 0);
  const resto = identificados - m.duplicatas - excluidos - m.naoObtidos;
  return { identificados, duplicatas: m.duplicatas, excluidos, resto, incluidos: m.incluidos, fecha: resto === m.incluidos };
}

// Decisões da triagem, uma por registro lido (1 = relevante). Os relevantes aparecem
// cedo (o ASReview põe os mais prováveis na frente) e o último vem `regra` registros
// antes de a máquina parar. Determinístico: sem acaso.
export function trilha(m) {
  const K = m.segundaLeitura;
  const L = m.ultimoRelevante;
  const pos = [];
  for (let k = 0; k < K; k++) {
    const u = K === 1 ? 1 : k / (K - 1);
    let p = Math.floor((L - 1) * (1 - Math.sqrt(1 - u)));
    if (k > 0 && p <= pos[k - 1]) p = pos[k - 1] + 1;
    pos.push(p);
  }
  const out = new Uint8Array(m.lidos);
  for (const p of pos) out[p] = 1;
  return out;
}

export const NO_FASE = [0, 0.6, 0.72, 1]; // triagem: lendo | parada e despejo | 2ª leitura

// Contadores da triagem no progresso p (0..1); `rastro` = trilha(m).
export function triagem(m, p, rastro = trilha(m)) {
  const q = Math.min(1, Math.max(0, p));
  const lendo = Math.min(1, q / NO_FASE[1]);
  const lidos = Math.round(m.lidos * lendo);
  let relevantes = 0, seguidos = 0;
  for (let i = 0; i < lidos; i++) { if (rastro[i]) { relevantes++; seguidos = 0; } else seguidos++; }
  const parou = lidos >= m.lidos;
  const despejo = q <= NO_FASE[1] ? 0 : Math.min(1, (q - NO_FASE[1]) / (NO_FASE[2] - NO_FASE[1]));
  const segunda = q <= NO_FASE[2] ? 0 : (q - NO_FASE[2]) / (1 - NO_FASE[2]);
  const excSegunda = Math.round(m.excSegunda * segunda);
  const seguem = Math.round(m.buscados * segunda);
  return {
    lidos, relevantes, seguidos, parou, excTitulo: lidos - relevantes,
    naoVistosDespejados: Math.round(m.naoVistos * despejo), despejo, segunda, excSegunda, seguem,
    horas: (lidos * TEMPO.minTitulo + Math.round(m.segundaLeitura * segunda) * TEMPO.minSegunda) / 60,
  };
}

export const lerHoras = (h) => h.toFixed(1).replace(".", ",");
export const milhar = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
