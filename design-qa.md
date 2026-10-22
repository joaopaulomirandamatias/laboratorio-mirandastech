# Revisão visual — aula de agentes de IA

## Fonte e estado comparado

- Referência: primeira imagem aprovada na conversa, original `generated_images/exec-858c4ec2-d620-450b-90a0-1f77da3444c4.png`, 1586 × 992. Cópia de revisão: [referência](docs/visual-qa/agentes-reference.webp).
- Implementação: `/maquinas/agentes/`, abertura, 1586 × 992, topo, movimento reduzido, contexto ativo, operação consultar, sem autorização de envio.
- Captura real: [abertura](site/assets/maq-agentes.webp).
- Comparação conjunta: [página inteira](docs/visual-qa/agentes-compare-full.webp), [máquina](docs/visual-qa/agentes-compare-machine.webp) e [tipografia/controles](docs/visual-qa/agentes-compare-type.webp). Mesmas dimensões e recortes dos dois lados.
- Estados complementares: [celular 390 × 844](docs/visual-qa/agentes-mobile.webp), [celular curto 375 × 667](docs/visual-qa/agentes-mobile-short.webp), [permissão](docs/visual-qa/agentes-permission.webp), [modelo 3D](docs/visual-qa/agentes-live-3d.webp).

## Achados e correções

| Achado inicial | Prioridade | Correção e evidência |
| --- | --- | --- |
| Máquina frontal, uniforme e sem acabamento semelhante à referência | P1 | Arte original transparente com composição diagonal, metal arredondado, vidro azul, núcleo gravado e portal de cobre. Comparação de máquina. |
| Cenário sem relevo, rochas ou profundidade | P1 | Terreno original em WebP, preservando área escura para leitura. Comparação inteira. |
| Título sem a família visual da referência | P1 | Spectral regular/itálica, duas linhas, azul no trecho final, tamanho e posição ajustados. Recorte de tipografia. |
| Botões, legendas e linha de etapas pequenos | P2 | Botões de 66 px, ícones locais, legendas de 16 px e linha do tempo com hierarquia comparável à referência. |
| Ausência de WebGL exibia uma lista de caixas | P1 | A abertura ilustrada funciona sem GPU e sem JavaScript. WebGL inicia apenas ao selecionar “Explorar em 3D”; falha mantém a aula utilizável. |
| Linha do tempo apertada no celular | P2 | Tipografia e espaçamento ajustados para 375/390 px, sem rolagem horizontal. |

## Validação

- 13 testes de modelo passaram.
- Verificação de navegador passou: seis etapas; contexto com/sem fontes; envio bloqueado/autorizado; registro; teclado; alternância ilustração/3D; movimento reduzido; celular 390 × 844 e 375 × 667; falta de Three.js; JavaScript desativado; nenhum pedido externo ou erro JavaScript/console no fluxo principal.
- Three.js real verificado com Chromium/SwiftShader. Rotação, seleção e pausa continuam disponíveis.
- Prévia no navegador conectado: abertura inspecionada e controle de permissão experimentado. Esse ambiente não oferece WebGL; a alternativa ilustrada permite usar a aula.
- Build gerado a partir das fontes e integridade de páginas/recursos conferidos.

## Resultado

**Passou para revisão visual da abertura e para uso da aula.** Nenhum P0/P1 pendente na abertura comparada. A aprovação estética final continua com o autor.

Diferenças intencionais: marca atual MirandasTech preservada; máquinas e documentos são arte original equivalente, não cópia pixel a pixel; linhas dos cartões são decorativas, com texto didático em HTML. A abertura usa uma composição de seis camadas de arte com animação e câmera controladas pelo navegador; o movimento é 2,5D, sem malha volumétrica. Cada etapa muda o foco e a escala da câmera, os planos flutuam e partículas percorrem caminhos SVG. O modo Three.js é um modelo volumétrico esquemático independente: não reproduz o acabamento fotográfico da arte. A referência possui mais partículas e arcos luminosos, uma diferença residual P2. Não houve publicação em produção.


## Revisão de movimento — 22/10/2026

Correção solicitada pelo autor: a abertura anterior ficava estática e as etapas não mudavam a cena. A abertura agora anima sem clique e sem WebGL. A seleção das seis etapas muda enquadramento, zoom e destaque do plano correspondente. Contexto desativado apaga documentos; envio bloqueado desvia as partículas para a barreira e reduz a resposta; autorização restabelece o percurso até a saída.

- [Gravação real da aula, percorrendo as etapas e a permissão](docs/visual-qa/agentes-animation-demo.mp4), 13,6 segundos. É uma gravação do navegador, diferente do clipe gerado por IA.
- O teste compara matrizes de transformação em instantes distintos, confirma avanço do relógio SVG, pausa/retomada efetivas, paralaxe ao mover o mouse e alteração da câmera entre capítulos.
- Pausa, movimento reduzido, ausência de WebGL, celular, abertura/reprodução/fechamento do vídeo e os fluxos pedagógicos passaram no teste de navegador completo.
- A revisão visual no navegador conectado confirmou a etapa Modelo com câmera em escala 1,18 e camada em movimento. Máscaras e fases de flutuação foram ajustadas para reduzir separações nas bordas dos documentos.
- O clipe Higgsfield de 5 segundos fica em **Ver vídeo**, carrega sob demanda e não substitui os controles da aula. Grok Video 1.5, job `a98082e3-1141-4c2e-afb0-144ccb95d642`; custo confirmado de 22,5 créditos, saldo de 170 após esta geração. O vídeo tem pequenas variações de luz/geometria próprias da geração; por isso é uma opção separada.
- A demonstração privada é atualizada no Sites; o site principal continua aguardando a revisão do PR #4.

**Resultado: passou para revisão do autor.** Movimento e transições foram verificados, além das capturas estáticas. Limite mantido: a cena principal é uma composição animada em 2,5D; o modelo volumétrico Three.js permanece uma opção independente.
