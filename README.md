# Laboratório MirandasTech

Campus digital dos **16 manuais MirandasTech de pesquisa científica**: uma página de entrada com as quatro trilhas e, atrás dela, a torre 3D navegável com protótipo WebXR para headset.

**No ar:** https://lab.mirandastech.com.br/ · torre 3D em https://lab.mirandastech.com.br/3d/ · espelho em https://manual.mirandastech.com.br/lab/

## Camadas

| Caminho | O que é |
|---|---|
| `site/index.html` | **O campus.** Página de entrada: as 4 trilhas com os 16 manuais ligados um a um, a camada do plugin, a seção de ciência aberta e um filtro de manuais. Sem framework: HTML, CSS e ~25 linhas de JavaScript. |
| `site/3d/index.html` | **A torre.** O hub tridimensional original, em React + Three.js, com a sessão WebXR. Continua sendo a visita guiada do campus. |
| `site/maquinas/<nome>/index.html` | **A bancada.** Uma etapa do método montada como máquina interativa, ligada pela seção "A bancada" do campus. Página única e gerada: não edite à mão. A primeira é a do PRISMA 2020 (manual 2.2). |
| `maquinas/<nome>/` | Fonte de cada máquina, fora de `site/` (não é servido). `model.mjs` é o modelo puro de onde sai todo número da tela, com testes em `node --test`; `node build.mjs` regera a página em `site/maquinas/<nome>/`. O build usa o kit da skill [anatomy](https://github.com/wheresryan22/anatomy) em `~/.claude/skills/anatomy` (ou `ANATOMY_SKILL`). `checks/` tem as checagens com Chrome headless (cliques reais e saltos de quadro). |
| `site/assets/` | Vídeo do átrio (em laço, 1,8 MB), as imagens das quatro trilhas, uma por manual e uma por máquina, em WebP. |
| `site/sitemap.xml` | Só as páginas deste host — cada manual vive no próprio subdomínio e precisa do seu próprio sitemap. Regere com `./scripts/sitemap.sh` depois de mexer nas páginas: o `lastmod` sai do git. |

O vídeo do topo é o átrio do campus em movimento; o título que vinha gravado no render foi removido por corte, e o clipe é concatenado com ele mesmo invertido para o laço não saltar. Todo texto da página é HTML sobre as imagens — nada de texto dentro do render, que é onde a geração por IA erra.

## Aula interativa: por dentro de um agente de IA

Em **[/maquinas/agentes/](https://lab.mirandastech.com.br/maquinas/agentes/)**, uma ilustração interativa em seis camadas acompanha pergunta, documentos, modelo, ferramentas, governança e resposta. A abertura segue a referência visual com arte renderizada em seis camadas independentes, terreno rochoso e tipografia serifada. O clipe Higgsfield de 5 segundos toca na abertura em loop e sem som. Ao escolher uma etapa, a cena em camadas assume: as plataformas flutuam, partículas percorrem a máquina e o mouse produz paralaxe. Cada etapa muda o foco, o zoom e o destaque da câmera; desativar contexto apaga os documentos, e bloquear o envio desvia a luz para a barreira. O botão Pausar movimento interrompe as animações. O botão **Modelo 3D** abre a cena Three.js com rotação, metal arredondado, vidro e iluminação de estúdio. O botão **Ampliar vídeo** abre o clipe em uma janela maior. Se o navegador bloquear a reprodução automática, as camadas animadas continuam disponíveis; movimento reduzido inicia com a cena pausada. A rolagem percorre cada etapa; as camadas também podem ser selecionadas por clique ou teclado. O visitante compara contexto ligado/desligado e consulta/envio com e sem permissão.

É uma simulação local com respostas preparadas e fichas didáticas identificadas. Não chama LLMs nem envia mensagens. O modelo é independente da cena; sem WebGL, há visão 2D, e a aula em texto funciona sem JavaScript. Animação respeita movimento reduzido, pode ser pausada e para fora da tela.

Fontes editáveis: `maquinas/agentes/`. Regerar com `node maquinas/agentes/build.mjs`; testar os modelos com `node --test maquinas/*/model.test.mjs`. A cena em camadas funciona sem WebGL; sem JavaScript mantém a arte e a leitura. Preferência por movimento reduzido pausa a animação inicial; o renderizador só inicia por escolha do visitante. Three.js r128, pós-processamento, ícones Lucide e as fontes são servidos localmente; licença do Three.js em `site/assets/vendor/three-LICENSE.txt`. Créditos dos recursos em `site/assets/agentes-ASSETS.md`. A moldura reutiliza `maquinas/prisma/shell.mjs`.

Verificação de navegador com Playwright: `node maquinas/agentes/checks/browser.mjs`. O script inicia um servidor local temporário; aceita `CHROME_PATH`, `PLAYWRIGHT_MODULE`, `CHECK_OUTPUT` e `BASE_URL` para testar um navegador instalado ou a versão publicada. Use `RECORD_DEMO=1` para gravar uma demonstração em WebM. Playwright é apenas uma ferramenta de teste, não uma dependência do site. As capturas vão para `/tmp/mirandastech-agentes-checks` por padrão.

## A torre 3D

Cada andar é uma trilha da pesquisa (Fundamentos, Busca e revisão, Dados e ferramentas, Escrita e entrega) e cada um dos quatro nós do andar é um manual, representado pelo **instrumento da etapa**: a balança do método, o chip do uso de IA, a bússola da orientação, a lupa da busca, o prisma da revisão sistemática, a rede de cocitação da bibliometria, o fichário do Zotero, o gráfico da análise de dados, a árvore de commits do Git, o cadeado aberto da ciência aberta, o envelope da submissão, o capelo da defesa. Todos são montados por primitivas em Three.js, sem modelo externo.

O eixo central é uma coluna de palavras do método subindo em laço. A borda de cada andar traz o nome da trilha. Clicar num nó, ou numa linha do índice, leva a câmera até o módulo e abre a ficha com manual e repositório.

## Como a torre foi feita

| Camada | O que |
|---|---|
| Interface | React 18 (UMD, sem etapa de build) — estado de baixa frequência: módulo selecionado, filtro, sessão XR |
| Cena | Three.js r128 — cena imperativa com API própria (`mount`, `select`, `setFilter`, `setExpansion`, `setMode`, `enterXR`) |
| Imersão | WebXR real: `renderer.xr`, referência `local-floor`, dois controles com laser e seleção pelo gatilho, painel holográfico em canvas |
| Deploy | Caddy estático (serve `site/` inteiro), imagem única |

Coordenadas de câmera e etiqueta de nó são escritas direto no DOM por refs, fora do estado do React, para não gerar re-renderização a cada quadro. Não há pós-processamento: o brilho é feito com sprites aditivos, porque `EffectComposer` não funciona dentro de uma sessão XR.

**WebXR só abre fora de moldura.** Navegadores recusam a sessão imersiva em iframe sem permissão de rastreamento espacial; use o endereço direto no navegador do headset.

## Os 16 manuais

Metodologia · Uso de IA · Orientador · Professor · Busca em bases · PRISMA 2020 · Bibliometria · Zotero · Análise de dados · Gemini Notebook · Git e GitHub · Plugin Pesquisa · LaTeX e abnTeX2 · Ciência aberta · Submissão, ORCID e Lattes · Defesa e qualificação.

Índice completo, com endereço e repositório de cada um, dentro da própria página.

## Como citar
MATIAS, J. P. M. *Laboratório MirandasTech: hub dos manuais de pesquisa científica.* MirandasTech, v1.0, set. 2026. CC BY 4.0.

## Declaração de uso de IA
Concebido e construído com assistência de IA (Claude, Anthropic; Codex, OpenAI). O vídeo do átrio e as imagens das trilhas são renders gerados por IA, sem correspondência com lugares ou pessoas reais — são ilustração, não registro. Os 16 fundos minimalistas de O Ciclo foram gerados com imagegen, da OpenAI, e otimizados em WebP; seus temas e prompts estão em `docs/ciclo-imagens.md`. O autor responde integralmente pelo conteúdo. Three.js, React, IBM Plex e os serviços citados nos manuais são de terceiros; este projeto não tem vínculo com eles.
