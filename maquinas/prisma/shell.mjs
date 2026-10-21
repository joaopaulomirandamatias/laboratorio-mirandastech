// Moldura do campus; não depende do kit de geometria da máquina.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(new URL('./shell.css', import.meta.url), 'utf8');
const campusLinks = html => html.replace(/href="#([^"]+)"/g, 'href="/#$1"');

export function withCampusShell(html, campus) {
  const header = campus.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0];
  const footer = campus.match(/<footer class="mt-foot">[\s\S]*?<\/footer>/)?.[0];
  if (!header || !footer) throw new Error('Menu ou rodapé padrão não encontrado no campus.');

  const searchLink = campusLinks(header).replace('aria-label="Nesta página"', 'aria-label="Navegar pelo laboratório"').replace(
    /<button class="icon-btn" id="btBusca" aria-label="Buscar um manual">([\s\S]*?)<\/button>/,
    '<a class="icon-btn" href="/#manuais" aria-label="Buscar um manual">$1</a>'
  );
  const primary = searchLink.match(/<nav class="navlinks"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  const external = searchLink.match(/<nav class="navext"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if (!primary || !external) throw new Error('Links do menu padrão não encontrados.');
  const mobile = '<details class="campus-mobile"><summary>Menu</summary>' +
    '<nav aria-label="Menu do laboratório">' + primary + external + '</nav></details>';
  const menu = searchLink.replace(/\s*<\/div>\s*<\/header>$/, mobile + '</div></header>');

  // A atualização é idempotente: permite sincronizar a moldura sem refazer o SVG.
  html = html.replace(/<!-- campus-header:start -->[\s\S]*?<!-- campus-header:end -->/g, '')
    .replace(/<!-- campus-footer:start -->[\s\S]*?<!-- campus-footer:end -->/g, '')
    .replace(/<style id="campus-shell-style">[\s\S]*?<\/style>/g, '');
  html = html.replace('<div class="pg">', '<main class="pg" id="conteudo">')
    .replace(/<\/div>(\s*<script type="module">)/, '</main>$1');
  const top = '<!-- campus-header:start -->' +
    '<a class="campus-skip" href="#conteudo">Pular para a máquina</a>' +
    '<div class="campus-shell campus-header">' + menu + '</div><!-- campus-header:end -->';
  const bottom = '<!-- campus-footer:start -->' +
    campusLinks(footer).replace('class="mt-foot"', 'class="mt-foot campus-shell"') +
    '<!-- campus-footer:end -->';
  return html.replace('</head>', '<style id="campus-shell-style">' + css + '</style></head>')
    .replace(/(<body\b[^>]*>)/, '$1' + top)
    .replace('<script type="module">', bottom + '<script type="module">');
}

// Sincroniza somente menu/rodapé da página já gerada, preservando cena e lógica.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = new URL('../../site/maquinas/prisma/index.html', import.meta.url);
  const campus = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
  writeFileSync(target, withCampusShell(readFileSync(target, 'utf8'), campus));
  console.log('Menu e rodapé sincronizados na máquina PRISMA.');
}
