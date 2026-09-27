#!/usr/bin/env bash
# Regera site/sitemap.xml com o lastmod de cada página tirado do git.
# Rode depois de mexer em site/index.html ou site/3d/index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
data(){ git log -1 --format=%cs -- "$1"; }
cat > site/sitemap.xml <<XML
<?xml version="1.0" encoding="UTF-8"?>
<!-- Só as páginas deste host. Cada um dos 16 manuais vive no próprio
     subdomínio e precisa do seu próprio sitemap. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lab.mirandastech.com.br/</loc>
    <lastmod>$(data site/index.html)</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lab.mirandastech.com.br/3d/</loc>
    <lastmod>$(data site/3d/index.html)</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
XML
echo "sitemap.xml regerado"
