# Piloto: máquina PRISMA do Laboratório MirandasTech

Construa UMA figura interativa ("máquina") que explica o manual 2.2 do
Laboratório MirandasTech (Revisão sistemática com PRISMA 2020,
https://prisma.mirandastech.com.br/) como página HTML única e autônoma,
nesta pasta. Não publique, não faça deploy, não faça commit nem push.

Use a skill /anatomy (instalada em ~/.claude/skills/anatomy). Leia o SKILL.md
dela e abra o exemplo mais próximo antes de começar.

## A máquina

Pergunta: "Como 4 mil artigos viram 30 numa revisão sistemática?"

Responda com uma máquina, não com um diagrama: uma triadora de registros real e
reconhecível, feita de muitas peças pequenas, em vista isométrica.

Passos são botões numa coluna à esquerda, só o próximo clicável:
[Buscar nas bases] [Deduplicar] [Triar título e resumo] [Ler texto completo] [Incluir].
Cada botão roda aquele passo na própria máquina.

Abra uma janela de corte na peneira de triagem: o ASReview aprende com cada
decisão e a máquina para quando a regra de parada é atingida. Quem vê enxerga a
causa e o efeito juntos.

Escreva antes de desenhar um modelo pequeno como função pura (model.mjs) e tire
dele todo número na tela: registros por base, duplicatas removidas, excluídos em
cada etapa, incluídos. Use os números de uma revisão sistemática real publicada,
com fluxograma PRISMA 2020, e cite a fonte no rodapé da figura. Se não achar uma
fonte verificável, marque os números como ilustrativos e diga isso no relatório.

A saída da máquina é o próprio fluxograma PRISMA 2020 se preenchendo, caixa por
caixa, conforme os passos rodam.

Embaixo da figura, uma linha: "A grande ideia: cada registro que sai do funil
tem um motivo anotado."

## Legível de relance

- uma dica curta por passo no topo, simples o bastante para quem nunca fez revisão
- botões em pílula com número no círculo; o passo atual acende, os feitos esmaecem
- chave Manual/Auto acima dos passos (Manual por padrão), lembrada entre visitas
- link "Recomeçar"
- slider "quebre a máquina": sensibilidade da string de busca; o modelo roda de
  novo e mostra mais registros e mais horas de triagem nos mesmos mostradores

## Estilo

O do Laboratório, não o de livro infantil: fundo escuro azul-marinho, acentos em
ciano, tipografia Geist (texto), Geist Mono (números) e Instrument Serif itálico
(destaques). Todo rótulo em pt-BR. Nenhum mostrador escondido atrás de outra peça.

## Checagem crítica antes de terminar

1. Capture um still no meio de cada passo e leia cada um: peça escondida, texto
   estourando a caixa, número que discorda do modelo.
2. Varra todo movimento maior que 1 s em passos de 0,1 s e conte pixels alterados
   por quadro. Quadro que muda 3x mais que os vizinhos é salto: ache e corrija.
3. Movimento lento é contínuo, nunca poses pré-desenhadas.

## Pronto quando

- o HTML abre sozinho no navegador e os 5 passos rodam nos dois modos
- `node --test` passa com um teste do modelo que confere a soma do fluxograma
  (identificados − duplicatas − excluídos em cada etapa = incluídos)
- os stills estão salvos em ./stills/

## Relatório final (RELATORIO.md nesta pasta)

Caminho dos arquivos, fonte dos números, o que a checagem crítica pegou e
corrigiu, e o que ficou de fora.
