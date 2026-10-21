// Varre todo movimento de cada passo em quadros de 0,1 s e conta pixels alterados por quadro.
// Um quadro que muda 3x mais que a mediana dos vizinhos é salto.
import { abrir, lerPng } from "./cdp.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
const HERE = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const arquivo = join(HERE, "../../site/maquinas/prisma/index.html");
const passo = 0.1;
const sens = process.argv.find((a) => a.startsWith("--sens="))?.slice(7);
const b = await abrir(arquivo, { width: 1500, height: 1000, scale: 1 });
if (sens) await b.js(`__prisma.setSens(${sens})`);
const plan = JSON.parse(await b.js("JSON.stringify({T0:__prisma.plan.T0,D:__prisma.plan.D})"));
const resumo = [];
let ruim = 0;
for (let s = 0; s < 5; s++) {
  const series = [];
  let ant = null;
  const n = Math.ceil(plan.D[s] / passo);
  for (let i = 0; i <= n; i++) {
    const G = plan.T0[s] + Math.min(i * passo, plan.D[s]);
    await b.js(`__prisma.seek(${G})`);
    await new Promise((r) => setTimeout(r, 40));
    const png = lerPng(await b.print("svg.pm", 1));
    if (ant) {
      let c = 0;
      for (let k = 0; k < png.d.length; k += 4) {
        const d = Math.abs(png.d[k] - ant.d[k]) + Math.abs(png.d[k + 1] - ant.d[k + 1]) + Math.abs(png.d[k + 2] - ant.d[k + 2]);
        if (d > 24) c++;
      }
      series.push(c);
    }
    ant = png;
  }
  const med = (a) => { const t = [...a].sort((x, y) => x - y); return t[Math.floor(t.length / 2)] ?? 0; };
  const saltos = [];
  series.forEach((v, i) => {
    const viz = series.slice(Math.max(0, i - 3), i).concat(series.slice(i + 1, i + 4));
    const m = med(viz);
    if (v > 150 && v > 3 * Math.max(m, 40)) saltos.push({ quadro: i + 1, t: +(plan.T0[s] + (i + 1) * passo).toFixed(2), px: v, vizinhos: m });
  });
  ruim += saltos.length;
  resumo.push({ passo: s + 1, quadros: series.length, max: Math.max(...series), mediana: med(series), saltos });
  console.log(`passo ${s + 1}: ${series.length} quadros · mediana ${med(series)} px · máx ${Math.max(...series)} px · saltos ${saltos.length}`, saltos.length ? JSON.stringify(saltos) : "");
  writeFileSync(join(HERE, "checks", `serie-passo${s + 1}${sens ? "-s" + sens : ""}.json`), JSON.stringify(series));
}
console.log(ruim === 0 ? "sem saltos" : `saltos: ${ruim}`);
if (b.erros.length) console.log("erros:", b.erros);
await b.fechar();
process.exit(ruim ? 1 : 0);
