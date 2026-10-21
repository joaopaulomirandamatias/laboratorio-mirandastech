// Mini-cliente do Chrome (CDP) para as checagens: abre a página, roda JS, tira prints.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const { chromePort } = await import(join(process.env.ANATOMY_SKILL || join(homedir(), ".claude/skills/anatomy"), "scripts/chrome-port.mjs"));

export async function abrir(arquivo, { width = 1500, height = 1000, scale = 1, reduced = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "prisma-chrome-"));
  const chrome = spawn(process.env.CHROME_PATH || "google-chrome", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const port = await chromePort(chrome, profile);
  const lista = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const alvo = lista.find((t) => t.type === "page");
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));
  let id = 0;
  const pend = new Map();
  const erros = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") erros.push(d.params.exceptionDetails.text + " " + (d.params.exceptionDetails.exception?.description ?? ""));
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") erros.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}) => new Promise((ok, fail) => { const i = ++id; pend.set(i, (d) => (d.error ? fail(new Error(d.error.message)) : ok(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 600 });
  if (reduced) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url: pathToFileURL(arquivo).href });
  await new Promise((r) => setTimeout(r, 1200));
  const api = {
    erros,
    send,
    async js(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async caixa(seletor) { return this.js(`(()=>{const r=document.querySelector(${JSON.stringify(seletor)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`); },
    async print(seletor, esc = 1, recorte) {
      const c = await this.caixa(seletor);
      const clip = recorte ? { x: c.x + recorte[0], y: c.y + recorte[1], width: recorte[2], height: recorte[3], scale: esc } : { ...c, scale: esc };
      const r = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
      return Buffer.from(r.data, "base64");
    },
    async fechar() { try { ws.close(); } catch {} chrome.kill("SIGKILL"); rmSync(profile, { recursive: true, force: true }); },
  };
  return api;
}

// decodifica PNG 8 bits (RGB ou RGBA) para { w, h, d: Uint8Array RGBA }
export function lerPng(buf) {
  let p = 8, w = 0, h = 0, ct = 6;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), tipo = buf.toString("ascii", p + 4, p + 8);
    if (tipo === "IHDR") { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ct = buf[p + 17]; }
    if (tipo === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  const stride = w * bpp;
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { out[(y * w + x) * 4] = cur[x * bpp]; out[(y * w + x) * 4 + 1] = cur[x * bpp + 1]; out[(y * w + x) * 4 + 2] = cur[x * bpp + 2]; out[(y * w + x) * 4 + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    [prev, cur] = [cur, prev];
  }
  return { w, h, d: out };
}
