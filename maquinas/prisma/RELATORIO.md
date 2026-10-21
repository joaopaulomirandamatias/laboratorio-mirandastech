# Relatório: máquina PRISMA (piloto)

## Arquivos
- `index.html`: a figura (página única, fontes Geist, Geist Mono e Instrument Serif embutidas, sem rede). Abre com duplo clique.
- `model.mjs`: modelo puro. Todo número da tela sai dele. `model.test.mjs`: 7 testes (`node --test` passa), incluindo a soma do fluxograma: identificados (+ citações) − duplicatas − excluídos de cada etapa = incluídos, para 7 sensibilidades.
- `scene.mjs`, `parts2.mjs`, `build.mjs`, `live.js`, `page.css`: geometria isométrica (kit da skill /anatomy), montagem e animação. Gerar: `node build.mjs`.
- `stills/`: um still no meio de cada passo, a parada da peneira, a 2ª leitura, o final, um zoom da janela de corte e uma captura a 390 px.
- `checks/`: `movimento.mjs` (varredura em passos de 0,1 s), `uso.mjs` (cliques reais nos dois modos), `diag.mjs`, `cdp.mjs`.

## Fonte dos números
Barrera B, Ahmed F, Brand T, Zeeb H. *Smoking cessation in pregnancy: a systematic review and meta-analysis of vulnerability approaches and expectant father involvement.* Public Health Reviews 2026;47. doi:10.3389/phrs.2026.1609825 (PMC13616806, CC BY). Fluxograma PRISMA 2020 (Fig. 1) e texto "Study selection", conferidos no texto completo:
9.045 registros; 4.765 duplicatas; 4.280 no ASReview; regra de parada = 5% (214) irrelevantes seguidos, atingida com 830 lidos; 3.450 sem leitura humana; 638 excluídos (desenho não experimental); 192 na 2ª leitura; 119 excluídos (população não gestante); 73 + 1 (citações) lidos em texto completo; 16 excluídos (desfecho de interesse ausente); **58 incluídos**. A conta fecha: 9.045 + 1 − 4.765 − 3.450 − 638 − 119 − 16 = 58.

**Ilustrativo (e marcado na figura):** a divisão dos 9.045 entre as 5 bases (o artigo só dá o total), o tempo por registro (30 s título/resumo, 8 min texto completo, daí 18,4 h) e o efeito do slider (×0,5 a ×2; a leitura humana cresce com a potência 0,6–0,7 do conjunto, a regra de parada é sempre 5%). "Relatórios não obtidos = 0" não consta no artigo.

**Título.** O brief pedia "4 mil artigos viram 30", número que não existe na fonte. Na revisão de 21/10 o título passou a "Como 9 mil registros viram 58 estudos", que é o que o artigo reporta.

## Revisão de 21/10/2026, antes de publicar
- **Sem spoiler.** Antes de um passo rodar, as placas mostram "—" em vez do número final esmaecido. A projeção do slider (registros e horas de triagem) passou para o texto do próprio slider, calculada pelo mesmo `modelo()`.
- **Tela do ASReview.** Linhas reespaçadas: a faixa "REGRA DE PARADA ATINGIDA" e "192 de 830 lidos" encavalavam com as linhas vizinhas na vista isométrica. A curva de relevantes acompanhou a caixa que subiu.
- **Navegação.** O sobretítulo virou link para o Laboratório e para o manual 2.2.
- `checks/uso.mjs` agora confere que as placas começam vazias e lê a projeção no slider; passa inteiro, com o console limpo.

## O que a checagem crítica pegou e corrigi
- Primeira versão: página pequena demais, mostradores sobrepostos e texto estourando (títulos das placas, rótulos do fluxograma, painel do ASReview). Redimensionei o viewBox, reposicionei placas e encurtei rótulos; um cesto estava escondido atrás da própria etiqueta e a etiqueta foi movida.
- Bug em trajetórias: fichas paradas entre dois segmentos eram extrapoladas para longe (o monte antes da peneira sumia). Corrigido com `clamp`.
- Classe `.lab` do invólucro colidia com a do botão (botões enormes).
- Saltos de cor: placas dos mostradores, caixas do fluxograma, barra e torre de sinal mudavam de cor num quadro só. A varredura marcou o primeiro e o último quadro de cada passo e o instante da parada. Passaram a ser interpolações pelo relógio.
- Varredura final (quadros de 0,1 s, pixels alterados por quadro, 469 quadros nos 5 passos): nenhum quadro passou de 3× a mediana dos vizinhos. Picos remanescentes de ~1,8× são dígitos de contador trocando e o instante em que os jatos varrem o monte parado; são movimento real, não salto.
- Movimento contínuo: tudo é função analítica do relógio (sem poses pré-desenhadas); fichas entram e saem por fade.
- `checks/uso.mjs`: os 5 passos nos dois modos, só o próximo clicável, esmaecer, Recomeçar, slider (×2 → 18.090 registros e 29,3 h; ×0,5 → 4.523 e 11,6 h) e memória do modo no localStorage, tudo ok, sem erros de console.

## O que ficou de fora
- A saída não sai de uma impressora desenhada na máquina; o fluxograma é o painel à direita (se preenche caixa por caixa).
- Sem versão clara, sem PDF, sem a auditoria `--audit` da skill (não uso tubos nem peças torneadas relevantes) nem `lines.mjs`; a ordem de pintura entre fichas e peças é por chave de profundidade e foi conferida só pelos stills.
- No celular a figura rola na horizontal (placas ficariam ilegíveis encolhidas).
- Movimento reduzido: só desliga o brilho dos botões; a máquina continua animando.
- Mexer no slider recomeça a máquina (não recalcula no meio de um passo).
- Fichas: 1 ficha = lote nos passos 1–2 e 5 registros na peneira; só o texto completo é 1:1. Os números na tela são sempre os do modelo.
