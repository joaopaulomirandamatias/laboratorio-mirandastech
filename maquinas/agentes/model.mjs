// Modelo pedagógico determinístico. Não chama modelos, APIs ou ferramentas reais.
export const STAGES = [
  { id: 'pergunta', name: 'Pergunta', title: 'Tudo começa com uma intenção.', body: '“Explique como um agente usa ferramentas e prepare um resumo.” A aplicação recebe a tarefa e define o que precisa entregar.', insight: 'Um pedido descreve um objetivo. Ele não concede, por si só, permissão para executar qualquer ação.', tag: '01 / ENTRADA' },
  { id: 'contexto', name: 'Contexto', title: 'A resposta encontra suas fontes.', body: 'Neste exemplo, duas fichas didáticas entram no contexto. O RAG recupera informação externa para apoiar a geração; ele não retreina o modelo.', insight: 'Desative o contexto e compare: uma resposta pode soar plausível sem apresentar uma fonte consultada.', tag: '02 / DOCUMENTOS' },
  { id: 'modelo', name: 'Modelo', title: 'O modelo propõe o próximo passo.', body: 'Um modelo de linguagem pode produzir texto ou propor uma chamada de ferramenta. Aqui, respostas preparadas permitem explorar esse fluxo sem depender de uma API.', insight: 'A animação representa uma arquitetura didática. Ela não mostra o raciocínio interno de um modelo.', tag: '03 / GERAÇÃO' },
  { id: 'ferramentas', name: 'Ferramentas', title: 'Consultar é diferente de agir.', body: 'Uma ferramenta conecta a aplicação a uma operação: consultar um documento ou enviar uma mensagem, por exemplo. Escolha a operação que será solicitada.', insight: 'MCP padroniza a troca de contexto e o acesso a capacidades. As regras de autorização continuam sendo responsabilidade da aplicação.', tag: '04 / CONEXÃO' },
  { id: 'governanca', name: 'Governança', title: 'Poder fazer não é poder executar.', body: 'A aplicação verifica a ação solicitada antes de executá-la. A consulta está permitida; o envio exige uma autorização explícita neste exemplo.', insight: 'Mude a permissão e veja o resultado. Uma solicitação do modelo não pode substituir a regra de autorização.', tag: '05 / PERMISSÃO' },
  { id: 'resposta', name: 'Resposta', title: 'A entrega vem com um registro.', body: 'O visitante recebe o resumo, as fichas usadas e o resultado da verificação de permissão. O registro torna visível o que aconteceu em cada etapa.', insight: 'Agentes reais podem repetir esse ciclo. Fontes, validação e registros ajudam na auditoria, mas não garantem uma resposta correta.', tag: '06 / ENTREGA' },
];

export const DOCUMENTS = [
  { id: '1', title: 'Ficha didática 01 · Ferramentas', text: 'Ferramentas expõem operações que a aplicação pode executar: consultar informação, calcular ou interagir com outro sistema.' },
  { id: '2', title: 'Ficha didática 02 · Governança', text: 'A aplicação deve conferir a autorização da operação solicitada e registrar seu resultado. Permissão de consulta não implica permissão de envio.' },
];

export function simulate({ context = true, action = 'read', allowSend = false } = {}) {
  const hasContext = context === true;
  const allowed = action === 'read' || (action === 'send' && allowSend === true);
  const status = allowed ? 'allowed' : 'blocked';
  const sources = hasContext ? DOCUMENTS.map(d => ({ ...d })) : [];
  const answer = hasContext
    ? 'Um agente pode solicitar ferramentas para consultar informação ou interagir com sistemas [1]. Antes da execução, a aplicação confere a permissão da operação e registra o resultado [2].'
    : 'Um agente pode usar ferramentas para consultar informação ou realizar operações. Nesta demonstração, a resposta sem contexto é um exemplo preparado e não possui fontes consultadas.';
  const outcome = action === 'read'
    ? 'Consulta autorizada · simulação local.'
    : action === 'send' && allowed
      ? 'Envio autorizado na simulação. Nenhuma mensagem foi enviada.'
      : action === 'send'
        ? 'Envio bloqueado: falta permissão explícita.'
        : 'Operação bloqueada: ação desconhecida.';
  return {
    status, answer, sources, outcome,
    log: [
      { stage: 'Pergunta', status: 'complete', detail: 'Tarefa recebida: explicar o uso de ferramentas.' },
      { stage: 'Contexto', status: hasContext ? 'complete' : 'skipped', detail: hasContext ? 'Duas fichas didáticas disponibilizadas.' : 'Contexto desativado; nenhuma fonte consultada.' },
      { stage: 'Modelo', status: 'complete', detail: 'Resumo preparado pela simulação, sem chamada a um LLM.' },
      { stage: 'Ferramentas', status: 'complete', detail: action === 'read' ? 'Operação solicitada: consultar.' : action === 'send' ? 'Operação solicitada: enviar resumo.' : 'Operação desconhecida.' },
      { stage: 'Governança', status, detail: outcome },
      { stage: 'Resposta', status: 'complete', detail: 'Resumo e registro disponíveis; nenhum envio real.' },
    ],
  };
}
