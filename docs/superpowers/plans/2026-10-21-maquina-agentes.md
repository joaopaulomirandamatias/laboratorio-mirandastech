# Máquina de IA — implementação da prévia aprovada

Escopo aprovado em conversa: uma aula pública no laboratório MirandasTech, seguindo a primeira imagem apresentada (máquina aberta em seis camadas). Implementação nativa nesta sessão.

1. Criar `maquinas/agentes/model.mjs` e testes para contexto, fontes e autorização simulada. Toda execução é local e determinística.
2. Criar template, CSS, cena Three.js e controles separados. Gerar `/maquinas/agentes/` com `build.mjs`, reutilizando menu e rodapé do campus.
3. Implementar rolagem guiada, seleção de camadas, consulta/envio simulado e comparação de contexto. Manter conteúdo textual, teclado, celular, movimento reduzido e alternativa sem WebGL.
4. Adicionar acesso na bancada do campus, sitemap, documentação e verificações de CI. Não alterar a bancada PRISMA nem a torre.
5. Validar modelo, geração, integridade, navegação real em navegador e capturas de desktop/celular; publicar a mudança no repositório e verificar a versão servida quando disponível.

Aula: Pergunta → Documentos → Modelo → Ferramentas → Governança → Resposta. É uma arquitetura didática simplificada; agentes reais podem iterar e nem todos usam RAG. Fontes da demonstração são fichas didáticas identificadas como tal. Não existe chamada de LLM, coleta de dados ou envio real.
