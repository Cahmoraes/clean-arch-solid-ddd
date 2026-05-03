# ADR005 — Desabilitar Rate Limiting em Testes via max: Infinity

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Em ambiente de testes (`NODE_ENV=test`), o plugin `@fastify/rate-limit` será registrado normalmente, porém com `max: Infinity`, desabilitando efetivamente o rate limiting sem remover o plugin do pipeline.

## Contexto

O PRD exige que o rate limiting seja desabilitado em ambiente de testes (RF-10, RF-11) de forma transparente, sem necessidade de configuração adicional nos arquivos de teste. O projeto usa `NODE_ENV=test` para ambiente de desenvolvimento/teste, verificado via helper `isDevelopment()`.

Os testes automatizados (unitários e business-flow) executam múltiplas requests em sequência rápida. Qualquer limite finito de rate limiting quebraria esses testes de forma intermitente e não determinística.

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Registrar plugin com `max: Infinity`
  - Prós: o plugin é registrado e inicializado normalmente, exercitando o código de configuração (keyGenerator, hooks, headers); transparente para os testes existentes; permite criar testes dedicados que sobrescrevem o `max` com valores finitos para validar o comportamento de rate limiting; sem branches condicionais que alterem a estrutura de hooks do Fastify
  - Contras: o plugin adiciona um hook no pipeline mesmo quando inoperante (overhead negligível)

- **Opção 2** — Não registrar o plugin em ambiente de testes
  - Prós: zero overhead — plugin simplesmente não existe
  - Contras: o código de configuração do plugin não é exercitado em testes; divergência entre o pipeline de hooks em test vs production (risco de bugs que só aparecem em produção); testes dedicados de rate limiting precisariam registrar o plugin manualmente, criando setup complexo

- **Opção 3** — Registrar plugin normalmente com limites finitos em todos os ambientes
  - Prós: comportamento idêntico em todos os ambientes
  - Contras: testes existentes quebram de forma intermitente; necessidade de adicionar rate-limit-aware logic em cada teste; violação direta do RF-10 e RF-11 do PRD

## Consequências

- Positivo: transparência total — nenhum teste existente precisa ser modificado
- Positivo: código de configuração do plugin é exercitado em todos os ambientes
- Positivo: permite testes dedicados de rate limiting com overrides finitos
- Positivo: pipeline de hooks idêntico em test e production
- Negativo: overhead marginal do plugin no pipeline de testes (considerado negligível)
