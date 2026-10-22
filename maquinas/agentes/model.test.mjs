import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './model.mjs';

test('consultar devolve o resumo e identifica as fichas didáticas usadas', () => {
  const result = simulate({ context: true, action: 'read', allowSend: false });
  assert.equal(result.status, 'allowed');
  assert.equal(result.sources.length, 2);
  assert.match(result.answer, /\[1\]/);
  assert.equal(result.log.length, 6);
});

test('sem contexto não apresenta fontes nem citações que não foram consultadas', () => {
  const result = simulate({ context: false, action: 'read', allowSend: false });
  assert.deepEqual(result.sources, []);
  assert.doesNotMatch(result.answer, /\[\d\]/);
  assert.equal(result.log[1].status, 'skipped');
});

test('solicitar envio sem permissão bloqueia a ação, mantendo o resumo disponível', () => {
  const result = simulate({ context: true, action: 'send', allowSend: false });
  assert.equal(result.status, 'blocked');
  assert.equal(result.log[4].status, 'blocked');
  assert.match(result.outcome, /bloqueado/i);
  assert.ok(result.answer.length > 20);
});

test('conceder permissão muda a simulação do envio para autorizado', () => {
  const result = simulate({ context: true, action: 'send', allowSend: true });
  assert.equal(result.status, 'allowed');
  assert.match(result.outcome, /autorizado/i);
  assert.match(result.outcome, /simulação/i);
});

test('uma ação desconhecida nunca recebe autorização', () => {
  assert.equal(simulate({ action: 'delete', allowSend: true }).status, 'blocked');
});

test('somente permissão booleana explícita autoriza envio', () => {
  for (const value of [undefined, null, 'true', 'false', 1]) {
    assert.equal(simulate({ action: 'send', allowSend: value }).status, 'blocked');
  }
});
