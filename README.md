# Laboratório MirandasTech

Hub imersivo dos **16 manuais MirandasTech de pesquisa científica**: uma torre de quatro andares navegável no navegador, com protótipo WebXR para headset.

**No ar:** https://lab.mirandastech.com.br/ · espelho em https://manual.mirandastech.com.br/lab/

## O que é

Cada andar é uma trilha da pesquisa (Fundamentos, Busca e revisão, Dados e ferramentas, Escrita e entrega) e cada um dos quatro nós do andar é um manual, representado pelo **instrumento da etapa**: a balança do método, o chip do uso de IA, a bússola da orientação, a lupa da busca, o prisma da revisão sistemática, a rede de cocitação da bibliometria, o fichário do Zotero, o gráfico da análise de dados, a árvore de commits do Git, o cadeado aberto da ciência aberta, o envelope da submissão, o capelo da defesa. Todos são montados por primitivas em Three.js, sem modelo externo.

O eixo central é uma coluna de palavras do método subindo em laço. A borda de cada andar traz o nome da trilha. Clicar num nó, ou numa linha do índice, leva a câmera até o módulo e abre a ficha com manual e repositório.

## Como foi feito

| Camada | O que |
|---|---|
| Interface | React 18 (UMD, sem etapa de build) — estado de baixa frequência: módulo selecionado, filtro, sessão XR |
| Cena | Three.js r128 — cena imperativa com API própria (`mount`, `select`, `setFilter`, `setExpansion`, `setMode`, `enterXR`) |
| Imersão | WebXR real: `renderer.xr`, referência `local-floor`, dois controles com laser e seleção pelo gatilho, painel holográfico em canvas |
| Deploy | Caddy estático (`site/index.html`), imagem única |

Coordenadas de câmera e etiqueta de nó são escritas direto no DOM por refs, fora do estado do React, para não gerar re-renderização a cada quadro. Não há pós-processamento: o brilho é feito com sprites aditivos, porque `EffectComposer` não funciona dentro de uma sessão XR.

**WebXR só abre fora de moldura.** Navegadores recusam a sessão imersiva em iframe sem permissão de rastreamento espacial; use o endereço direto no navegador do headset.

## Os 16 manuais

Metodologia · Uso de IA · Orientador · Professor · Busca em bases · PRISMA 2020 · Bibliometria · Zotero · Análise de dados · Gemini Notebook · Git e GitHub · Plugin Pesquisa · LaTeX e abnTeX2 · Ciência aberta · Submissão, ORCID e Lattes · Defesa e qualificação.

Índice completo, com endereço e repositório de cada um, dentro da própria página.

## Como citar
MATIAS, J. P. M. *Laboratório MirandasTech: hub dos manuais de pesquisa científica.* MirandasTech, v1.0, set. 2026. CC BY 4.0.

## Declaração de uso de IA
Concebido e construído com assistência de IA (Claude, Anthropic). O autor responde integralmente pelo conteúdo. Three.js, React, IBM Plex e os serviços citados nos manuais são de terceiros; este projeto não tem vínculo com eles.
