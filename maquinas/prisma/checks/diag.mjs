import { abrir, lerPng } from "./cdp.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const arquivo = join(fileURLToPath(new URL(".", import.meta.url)), "../../../site/maquinas/prisma/index.html");
const [t0, t1] = process.argv.slice(2).map(Number);
const b = await abrir(arquivo, { width: 1500, height: 1000, scale: 1 });
const shots = [];
for (const G of [t0, t1]) { await b.js(`__prisma.seek(${G})`); await new Promise((r) => setTimeout(r, 60)); shots.push(lerPng(await b.print("svg.pm", 1))); }
const [a, c] = shots;
let minx = 1e9, miny = 1e9, maxx = 0, maxy = 0, n = 0;
const cells = {};
for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const k = (y * a.w + x) * 4; const d = Math.abs(a.d[k] - c.d[k]) + Math.abs(a.d[k + 1] - c.d[k + 1]) + Math.abs(a.d[k + 2] - c.d[k + 2]); if (d > 24) { n++; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); const key = Math.floor(x / 60) + "," + Math.floor(y / 60); cells[key] = (cells[key] || 0) + 1; } }
console.log("px", n, "bbox", minx, miny, maxx, maxy, "svg", a.w, a.h);
console.log(Object.entries(cells).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, v]) => k + ":" + v).join("  "));
await b.fechar();
