// Usa a página de verdade: cliques nos dois modos, Recomeçar, memória do modo e o slider.
import { abrir } from "./cdp.mjs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const arquivo = join(fileURLToPath(new URL(".", import.meta.url)), "../../../site/maquinas/prisma/index.html");
const esp = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "FALHA") + " " + msg); if (!cond) falhas++; };
const estado = (b) => b.js(`(()=>({status:[...document.querySelectorAll('[data-step]')].map(x=>x.dataset.status),dis:[...document.querySelectorAll('[data-step]')].map(x=>x.disabled),modo:document.body.dataset.mode,done:document.body.dataset.done,tip:document.querySelector('#dica').textContent,read:document.querySelector('[data-readout]').textContent}))()`);
const heads = (b) => b.js(`[...document.querySelectorAll('.head')].map(h=>h.querySelector('.h-val').textContent).join(' | ')`);
const fluxo = (b) => b.js(`(()=>{const o={};document.querySelectorAll('.f-box').forEach(g=>{o[g.dataset.id]=[...g.querySelectorAll('.f-num')].map(t=>t.textContent).filter(Boolean)});return JSON.stringify(o)})()`);
const ate = async (b, cond, ms = 70000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.js(cond)) return true; await esp(250); } return false; };

// ---- Manual
let b = await abrir(arquivo, { width: 1500, height: 1000 });
let e = await estado(b);
ok(e.modo === "manual", "abre em Manual");
ok(e.dis.join() === "false,true,true,true,true", "só o passo 1 é clicável: " + e.dis.join());
await b.js(`document.querySelector('[data-step="1"]').click()`); await esp(300);
e = await estado(b); ok(e.status[1] === "todo" && e.done === "0", "clicar no passo 2 não faz nada");
for (let i = 0; i < 5; i++) {
  await b.js(`document.querySelector('[data-step="${i}"]').click()`);
  await esp(600);
  e = await estado(b);
  ok(e.status[i] === "active" && e.dis.every(Boolean), `passo ${i + 1} rodando: aceso, nenhum botão clicável`);
  ok(await ate(b, `document.body.dataset.done==='${i + 1}'`), `passo ${i + 1} termina`);
  e = await estado(b);
  const esperado = i < 4 ? ["done", "next"] : ["done"];
  ok(e.status[i] === "done" && (i === 4 || (e.status[i + 1] === "next" && e.dis[i + 1] === false)), `passo ${i + 1} esmaece e libera o seguinte: ${e.status.join()}`);
}
console.log("   mostradores:", await heads(b));
console.log("   fluxograma:", await fluxo(b));
const h = await heads(b);
ok(h === "9.045 | 4.765 | 18,4 h | 16 | 58", "mostradores finais batem com o modelo: " + h);
const fl = JSON.parse(await fluxo(b));
ok(fl.inc.join() === "n = 58" && fl.triados.join() === "n = 4.280" && fl.aval.join() === "n = 74", "fluxograma fechou em 58");
// Recomeçar
await b.js(`document.querySelector('#recomecar').click()`); await esp(500);
e = await estado(b); ok(e.done === "0" && e.status[0] === "next", "Recomeçar volta ao início");
console.log("   após recomeçar:", await heads(b));
// Slider: antes de rodar, as placas mostram "—"; a projeção do modelo fica no texto do slider.
ok((await heads(b)).split(" | ").every((v) => v.startsWith("—")), "placas sem spoiler antes do passo 1");
const proj = (b) => b.js(`document.querySelector('#sensHint').textContent`);
await b.js(`(()=>{const s=document.querySelector('#sens');s.value='1';s.dispatchEvent(new Event('input'))})()`); await esp(600);
const h1 = await proj(b);
console.log("   slider ×2:", h1, "|", await b.js(`document.querySelector('#sensOut').textContent`));
await b.js(`(()=>{const s=document.querySelector('#sens');s.value='0';s.dispatchEvent(new Event('input'))})()`); await esp(600);
const h0 = await proj(b);
console.log("   slider ×0,5:", h0);
const n = (t) => +t.match(/([\d.]+) registros/)[1].replace(/\./g, "");
const hr = (t) => +t.match(/([\d,]+) h de triagem/)[1].replace(",", ".");
ok(n(h1) > 9045 && n(h0) < 9045, "mais sensibilidade, mais registros");
ok(hr(h1) > 18.4 && hr(h0) < 18.4, "mais sensibilidade, mais horas");
await b.js(`(()=>{const s=document.querySelector('#sens');s.value='1';s.dispatchEvent(new Event('input'))})()`); await esp(500);
await b.js(`document.querySelector('[data-step="0"]').click()`);
ok(await ate(b, `document.body.dataset.done==='5' || document.body.dataset.done==='1'`, 20000), "com a busca ampla o passo 1 roda");
await b.js(`__prisma.setSens(0.5)`);
ok(b.erros.length === 0, "sem erros no console " + JSON.stringify(b.erros));
await b.fechar();

// ---- Auto + memória do modo
b = await abrir(arquivo, { width: 1500, height: 1000 });
await b.js(`document.querySelector('[data-mode="auto"]').click()`); await esp(500);
e = await estado(b); ok(e.modo === "auto" && e.dis.every(Boolean), "Auto: botões desligados");
ok(await ate(b, `document.body.dataset.done==='5'`, 90000), "Auto roda os 5 passos sozinho");
const ha = await heads(b);
ok(ha === "9.045 | 4.765 | 18,4 h | 16 | 58", "Auto termina com os mesmos números: " + ha);
ok(await b.js(`localStorage.getItem('prisma-maquina-modo')`) === "auto", "modo guardado no localStorage");
await b.js(`location.reload()`); await esp(1500);
e = await estado(b);
ok(e.modo === "auto", "o modo Auto volta depois de recarregar");
await b.js(`document.querySelector('[data-mode="manual"]').click()`); await esp(300);
ok(await b.js(`localStorage.getItem('prisma-maquina-modo')`) === "manual", "voltar a Manual também é lembrado");
ok(b.erros.length === 0, "sem erros no console (Auto) " + JSON.stringify(b.erros));
await b.fechar();
console.log(falhas ? `${falhas} falhas` : "tudo certo");
process.exit(falhas ? 1 : 0);
