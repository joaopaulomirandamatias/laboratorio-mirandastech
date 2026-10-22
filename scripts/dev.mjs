// Development-only static server. Production continues to use Caddy.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4173;
const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : '0.0.0.0';
const root = fileURLToPath(new URL('../site/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4' };
createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const stat = statSync(file);
    if (!stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': stat.size });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, host, () => console.log(`MirandasTech preview ready on port ${port}`));
