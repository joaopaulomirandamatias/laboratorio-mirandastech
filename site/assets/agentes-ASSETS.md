# Recursos da aula de agentes de IA

- `agentes-terrain.webp`: cenário original gerado para esta aula a partir da referência visual aprovada; 1586 × 992.
- `agentes-machine.webp`: arte original gerada para esta aula, com transparência; 1024 × 1536. É a fonte visual da abertura, recortada em seis máscaras CSS complementares e animada por camada, com câmera, paralaxe e efeitos SVG. Não representa uma malha volumétrica.
- `agentes-motion.mp4`: clipe original de 5 segundos gerado no Higgsfield (Grok Video 1.5), job `a98082e3-1141-4c2e-afb0-144ccb95d642`, a partir da máquina autorizada. Versão web sem áudio, 512 px de largura, H.264; original 768 × 1168 no Higgsfield. Geração única, cotação de 22,5 créditos.
- `maq-agentes.webp`: captura da página implementada, usada no cartão do laboratório e Open Graph.
- `fonts/Spectral-*.woff`: Spectral, Production Type / Google Fonts; SIL Open Font License em `fonts/Spectral-OFL.txt`. Subconjunto latino e pontuação, sem alteração de desenho.
- `fonts/InstrumentSerif-Regular.ttf`: Instrument Serif, Rodrigo Fuenzalida / Google Fonts; SIL Open Font License em `fonts/InstrumentSerif-OFL.txt`.
- `icons/*.svg`: Lucide, licença ISC em `icons/LICENSE.txt`; cor ajustada para o tema da aula.
- `vendor/three-r128-postprocessing.js`: componentes oficiais Three.js r128 (CopyShader, LuminosityHighPassShader, EffectComposer, RenderPass, ShaderPass, UnrealBloomPass e SavePass), sob MIT em `vendor/three-LICENSE.txt`. Origem: https://github.com/mrdoob/three.js/tree/r128/examples/js

A cena Three.js usa geometria procedural independente da arte ilustrada. O botão **Modelo 3D** inicia o renderizador; sem WebGL a ilustração e toda a simulação continuam disponíveis. Todos os recursos são servidos localmente, sem dependência de CDN ou API na aula.

O movimento principal é executado no navegador, sem cobrança de IA por visita. A animação tem pausa, respeita movimento reduzido inicialmente e para quando a cena está fora da tela, a aba está oculta ou o vídeo está aberto. O vídeo é opcional e só é carregado quando solicitado.
