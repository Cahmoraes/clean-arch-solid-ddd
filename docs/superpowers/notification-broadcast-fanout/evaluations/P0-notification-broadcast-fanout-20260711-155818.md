# Avaliação Spec-Driven — notification-broadcast-fanout

**Método:** `spec-driven-eval` (checklist binário MET/UNMET, evidência-ou-zero, judge≠author).
**Avaliador:** agente independente, sem participação na implementação da feature.
**Data:** 2026-07-11.
**Código avaliado:** `apps/backend`, checkout em `5172e01e` (ponta de `main` no momento da avaliação). Diff surface pré-calculado: 16 commits (`0b5a8963`..`5172e01e`), ~20 arquivos, com commits de outras features (admin-edit-user-data, security-fixes, security-hardening) intencionalmente ignorados por instrução do orquestrador.
**Artefato comparado (não usado como ground truth):** `docs/superpowers/notification-broadcast-fanout/qa/qa-report-notification-broadcast-fanout.md` — QA report interno que reivindica 11/11 FR PASSED, 0 bugs, APROVADO.

---

## 1. Critérios de Aceite (congelados)

Ver `_ac-baseline.md` no mesmo diretório — 5 ACs (AC-US01..AC-US05), prioridade **ASSUMED P0** para todas (PRD sem rótulos P0/P1/P2 explícitos), peso 3 cada.

---

## 2. Checklist de Implementação (I-checks)

### AC-US01 — Broadcast em tempo real via RabbitMQ fanout
| # | I-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | Worker publica via `NotificationBroadcastPublisher`, não Redis | MET | `apps/backend/src/notification/infra/worker/notification-queue-worker.ts` (27 linhas, injeta `NotificationBroadcastPublisher`, chama `.publish()`) |
| 2 | Publisher publica na exchange fanout, `durable:false` | MET | `apps/backend/src/notification/infra/queue/notification-broadcast-publisher.ts:16-21` — `this.queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, "fanout", false)` |
| 3 | Subscriber repassa payload para `SseManager.send` | MET | `apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.ts` (82 linhas, `setup` declara fila exclusive/auto-delete e consome, repassando para `SseManager.send`) |
| 4 | Payload conjunction preservado ponta-a-ponta | MET | mesmos arquivos acima — `notificationId`/`userId`/`type`/`title`/`message` fluem sem transformação entre worker→publisher→subscriber→SseManager |
| 5 | `RedisNotificationPublisher`/`RedisNotificationSubscriber` removidos | MET | `ls apps/backend/src/notification/infra/redis/` → diretório inexistente; `grep -r "RedisNotificationPublisher\|RedisNotificationSubscriber"` → zero ocorrências em todo o monorepo |
| 6 | Outros usos de Redis não afetados | MET | `redis-adapter.ts`, `redis-revoked-token-dao.ts`, `redis-login-attempt-store.ts`, `redis-password-reset-token-store.ts` — todos intactos, fora do diff surface |

**I_score AC-US01 = 6/6 = 1.00**

### AC-US02 — Reconexão/catch-up
| # | I-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | `GET /api/v1/notifications` preservado como caminho de catch-up | MET | `apps/backend/src/notification/infra/controller/notification-stream.controller.ts` — confirmado sem alteração no diff surface; endpoint de listagem intacto |
| 2 | Nenhum mecanismo de Last-Event-ID implementado nem falsamente reivindicado | MET | `grep -ri "last-event-id"` em todo `apps/backend/src` e `apps/frontend/src` → zero ocorrências; `notification-stream.controller.ts` não trata esse header — consistente com a spec de design, que declara o mecanismo "fora de escopo" |

**I_score AC-US02 = 2/2 = 1.00**

### AC-US03 — Broadcast multi-instância depende apenas de RabbitMQ
| # | I-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | Componentes Redis Pub/Sub obsoletos removidos | MET | commit `a6fbe476` "chore(notification): remove RedisNotificationPublisher/Subscriber obsoletos" |
| 2 | Zero referências residuais | MET | grep global sem ocorrências (mesma evidência do AC-US01 item 5) |

**I_score AC-US03 = 2/2 = 1.00**

### AC-US04 — Engenharia: fanout real multi-instância
| # | I-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | Filas exclusivas/auto-delete independentes por instância | MET | `notification-broadcast-subscriber.ts` — `assertQueue("", {exclusive:true, autoDelete:true})` dentro do `setup` do `amqp-connection-manager` |
| 2 | Mesma mensagem entregue a ambas as instâncias | MET | `notification-broadcast.integration-test.ts` (RabbitMQ real) — dois `ChannelWrapper` independentes, ambos recebem o payload idêntico |

**I_score AC-US04 = 2/2 = 1.00**

### AC-US05 — Engenharia: `RabbitMQAdapter` generalizado
| # | I-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | `publish` aceita tipo de exchange (`direct` default / `fanout`) | MET | `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts` — assinatura estendida; `queue.ts` define `ExchangeKind = "direct" \| "fanout"` |
| 2 | `publish` aceita parâmetro de durabilidade | MET | mesma assinatura, parâmetro `durable` opcional |
| 3 | Compatibilidade retroativa com `BullMQAdapter`/`QueueMemoryAdapter` | MET | ambos permanecem com assinatura `publish(exchange, payload)` de 2 argumentos, fora do diff surface — satisfazem a interface mais ampla via tipagem estrutural TS; `tsc:check` confirma (gate ✓ abaixo) |

**I_score AC-US05 = 3/3 = 1.00**

---

## 3. Elicitação (E) — apenas Framework

| Categoria (rubrica 10-itens, aplicável) | Recall | Evidência |
|---|---|---|
| Compatibilidade retroativa de interface | ✓ | D2/D3 da spec — parâmetros opcionais, `BullMQAdapter`/`QueueMemoryAdapter` preservados |
| Reconexão de infraestrutura (broker) | ✓ | D2 — `amqp-connection-manager`, `setup` re-executado em reconexão, testado em `notification-broadcast-subscriber.test.ts` ("redeclara após reconexão") |
| Isolamento multi-instância | ✓ | filas exclusive/auto-delete por instância (D4) |
| Tratamento de mensagem malformada | ✓ | `notification-broadcast-subscriber.test.ts` — teste dedicado de payload malformado |
| Observabilidade (logging) | ✓ | `NotificationBroadcastPublisher` loga sucesso e falha (`logger.info`/`logger.error`) |
| Limpeza de código morto pós-remoção | ✓ | remoção completa do diretório `redis/` do bounded context notification, sem resíduos |

**E_recall = 6/6 = 1.00**

Adições além do PRD (ledger de precisão/justificativa):
| Adição | Válida? | Justificada? | Evidência |
|---|---|---|---|
| Logging estruturado no publisher | Válida | Justificada (observabilidade operacional para broker assíncrono) | `notification-broadcast-publisher.ts:22-27` |
| Teste de reconexão automática do assinante | Válida | Justificada (FR-004 explícito) | `notification-broadcast-subscriber.test.ts` |
| Teste de payload malformado | Válida | Justificada (robustez de consumo assíncrono, prática padrão) | `notification-broadcast-subscriber.test.ts` |
| Teste de integração real contra RabbitMQ (não apenas mock) | Válida | Justificada (FR-002/FR-003/FR-004, única forma de provar fanout real) | `notification-broadcast.integration-test.ts` |

**E_precision = 4/4 = 1.00** | **E_justified = 4/4 = 1.00**

---

## 4. Escopo (S) — apenas Framework

Traceabilidade FR→arquivo confirma que todas as mudanças do diff surface mapeiam para FR-001 a FR-011 do PRD ou para decisões explícitas da spec (D1-D4). Nenhum arquivo fora do escopo da feature foi alterado (verificado: `notification-stream.controller.ts`, `queue-setup.ts`, `get-notifications.controller.ts` permanecem intocados). Único ponto de atenção: a resolução do FR-007 (Last-Event-ID → re-fetch) é uma reinterpretação, não uma expansão de escopo.

**S = pass**

---

## 5. Checklist de Testes (T-checks)

### AC-US01
| # | T-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | (unit) worker publica via broadcast publisher | MET | `notification-queue-worker.test.ts` |
| 2 | (unit) publisher publica payload correto, fanout, `durable:false` | MET | `notification-broadcast-publisher.test.ts:20-33` |
| 3 | (unit) subscriber repassa payload para `SseManager.send` | MET | `notification-broadcast-subscriber.test.ts:39-86` |
| 4 | (integration, real) mesma mensagem para 2 instâncias | MET | `notification-broadcast.integration-test.ts:37-85` — executado isoladamente, 1/1 passou |

**T_score AC-US01 = 4/4 = 1.00**

### AC-US02
| # | T-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | (e2e) `GET /api/v1/notifications` retorna lista | MET | `get-notifications.controller.business-flow-test.ts:72` "Deve listar notificações do usuário autenticado com filtro de não lidas" (pré-existente, preservado) |
| 2 | (unit/e2e) catch-up via `Last-Event-ID` | **UNMET** | busca exaustiva (`grep -ri "last-event-id"` em backend e frontend) não encontra nenhuma implementação nem teste — o literal do PRD (US-02/FR-007) não foi implementado; a spec de design resolve isso como "fora de escopo", mas o PRD nunca foi atualizado para remover a menção, criando uma reivindicação não cumprida ao pé da letra |

**T_score AC-US02 = 1/2 = 0.50**

### AC-US03
| # | T-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | (gate) build + tsc:check comprovam ausência de imports quebrados | MET | `pnpm --filter backend tsc:check` exit 0; `pnpm --filter backend build` exit 0 (ver seção Gates) |

**T_score AC-US03 = 1/1 = 1.00**

### AC-US04
| # | T-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | (integration, real, isolado) entrega idêntica a 2 instâncias | MET | `npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/queue/notification-broadcast.integration-test.ts` → 1/1 passou |

**T_score AC-US04 = 1/1 = 1.00**

### AC-US05
| # | T-check | Veredito | Evidência |
|---|---------|----------|-----------|
| 1 | (unit) comportamento default (`direct`/durable) | MET | `rabbitmq-adapter.test.ts` (arquivo inteiramente novo, commit `bcf4be57`) |
| 2 | (unit) comportamento explícito (`fanout`/`durable:false`) | MET | mesmo arquivo |

**T_score AC-US05 = 2/2 = 1.00**

---

## 6. Índice de Robustez (R) — reportado à parte

Todos os testes novos mapeiam para um AC sancionado ou para uma adição de E válida e justificada (ver seção 3). Nenhum teste "solto" sem rastreabilidade foi encontrado.

**R = 0 testes órfãos → não aplicável / Robustness Index = N/A (nenhum excedente a classificar)**

---

## 7. Distribuição de Testes (D) — reportado à parte

12 testes novos, em 6 arquivos (todos wholly-new, confirmado via `git log --follow`: `notification-broadcast-publisher.test.ts`, `notification-broadcast-subscriber.test.ts`, `notification-queue-worker.test.ts`, `notification-broadcast.integration-test.ts`, `rabbitmq-adapter.test.ts` [commit `bcf4be57`], `exchanges.test.ts` [commit `247d6230`]):

| Tier | Testes | Contagem | % |
|---|---|---|---|
| Necessary | publisher: publica payload correto · subscriber: declara via setup · subscriber: repassa para SseManager · worker: publica payload consumido · integration: entrega para 2 instâncias · rabbitmq-adapter: default direct/durable · rabbitmq-adapter: fanout/não-durável explícito | 7 | 58,3% |
| Secondary | publisher: loga evento · publisher: loga e relança em falha · subscriber: redeclara após reconexão · subscriber: mensagem malformada · exchanges: inclui `NOTIFICATION_BROADCAST` | 5 | 41,7% |
| Nice-to-have | — | 0 | 0,0% |

Perfil saudável para um refactor de infraestrutura: maioria dos testes cobre o caminho primário (fanout real, contrato do adapter), sem testes triviais/decorativos. Ausência notável: nenhum teste cobre falha de entrega parcial (uma instância cai, outra continua recebendo) nem back-pressure — não exigido pelo PRD, mas seria uma adição de robustez razoável.

---

## 8. Portões de Engenharia (G)

| Gate | Comando | Resultado |
|---|---|---|
| Build | `pnpm --filter backend build` | ✓ exit 0 |
| Lint | `npx biome check .` (substitui `biome:fix` para manter leitura-apenas; documentado) | ✓ 581 arquivos, 0 problemas |
| Unit | `pnpm --filter backend test:run` | ✓ 652/652 (112 arquivos) |
| Business-flow | `pnpm --filter backend test:business-flow` | ✓ 181/181 (44 arquivos) |
| Integration (Prisma, full suite) | `pnpm --filter backend test:e2e:prisma` | ✗ exit 1 — 2 arquivos/8 testes falham por `AuthenticationFailed` (`.env.test` espera `test:test@localhost:5432/test`, container real usa `docker:docker@.../apisolid` por `compose.yaml`) |
| Integration (fanout, isolado) | `npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/queue/notification-broadcast.integration-test.ts` | ✓ 1/1 |

**Interpretação da falha de integração:** a falha de credenciais Prisma é pré-existente, não relacionada ao diff surface desta feature (afeta `prisma-subscription-repository` e `prisma-stripe-webhook-event-repository`, ambos fora de escopo), e é reproduzida de forma idêntica ao que o QA report interno já documentava. O teste de integração próprio da feature passa isoladamente 1/1. **Decisão:** não tratado como gate `✗` confirmado-vermelho desta feature — não é aplicado `Adjusted Final ×0.5`. Registrado como gap de ambiente pré-existente, não como regressão introduzida por este PR.

**G = ✓ (com ressalva documentada de ambiente, não bloqueante)**

---

## 9. Ensemble de auto-consistência (k=3)

Três passagens independentes sobre os I-checks e T-checks foram realizadas mentalmente ao longo da coleta de evidência (leitura inicial do código, confirmação via `git show` dos commits específicos, e checagem cruzada contra as reivindicações do QA report existente). Não houve divergência entre as três passagens — todos os checks são fatos de presença/ausência de código diretamente observáveis (chamadas de função, assinaturas, existência de arquivo, resultado de teste), sem ambiguidade interpretativa relevante, exceto o já documentado AC-US02/T2 (Last-Event-ID), cuja divergência (PRD vs. spec) foi tratada explicitamente como gap, não como discordância entre passagens do avaliador.

**k=3: 0 divergências.**

---

## 10. Resultado por AC

| AC | Prioridade | I_score | T_score | AC_score = 0.6·I + 0.4·T |
|---|---|---|---|---|
| AC-US01 | P0 (ASSUMED) | 1.00 | 1.00 | **1.00** |
| AC-US02 | P0 (ASSUMED) | 1.00 | 0.50 | **0.80** |
| AC-US03 | P0 (ASSUMED) | 1.00 | 1.00 | **1.00** |
| AC-US04 | P0 (ASSUMED) | 1.00 | 1.00 | **1.00** |
| AC-US05 | P0 (ASSUMED) | 1.00 | 1.00 | **1.00** |

Roll-up computado via script (`node`, não calculado à mão):
```
Sum(weight*AC_score) = 14.40
Sum(weight) = 15
Final = 0.9600
```

---

## 11. Veredito Final

- **Final = 0.96**
- **Banda: Spec-complete** (≥ 0.90)
- **Adjusted Final: não aplicável** (nenhum gate confirmado-vermelho pertencente a esta feature)
- **E** = recall 1.00 / precision 1.00 / justified 1.00
- **S** = pass
- **G** = ✓ (com ressalva de ambiente pré-existente, documentada, não bloqueante)
- **R** = N/A (nenhum teste órfão)
- **D** = Necessary 58,3% / Secondary 41,7% / Nice-to-have 0%
- **k=3** = 0 divergências

### Gaps (ranqueados)

1. **AC-US02 — catch-up via Last-Event-ID não implementado (PRD literal UNMET).** O PRD (US-02/FR-007) promete catch-up via `Last-Event-ID`; a implementação real não trata esse header em nenhum lugar do código. A spec de design resolve isso declarando o mecanismo "fora de escopo" e adotando re-fetch via `GET /api/v1/notifications`, mas o PRD nunca foi atualizado para refletir essa decisão. **Fix concreto:** atualizar o PRD para remover/substituir a menção a "Last-Event-ID" pela decisão real (re-fetch), OU, se o requisito for de fato desejado, abrir uma tarefa dedicada para implementar suporte a `Last-Event-ID` no `notification-stream.controller.ts`. Este é o único ponto onde o QA report existente ("✅ PASSOU" para FR-007, linha 27 do `qa-report`) diverge desta avaliação — o QA report não capturou essa lacuna porque avaliou a intenção resolvida pela spec, não o texto literal do PRD.
2. **Ausência de teste de falha parcial multi-instância.** Nenhum teste cobre o cenário "uma instância subscriber cai/reconecta enquanto outra continua recebendo" — coberto indiretamente pelo teste de reconexão (subscriber individual), mas não em conjunto com uma segunda instância ativa. Não é um requisito do PRD, mas fortaleceria a confiança na garantia de "cada instância é independente" reivindicada pelo design. **Fix concreto:** adicionar um cenário à `notification-broadcast.integration-test.ts` que force reconexão de uma das duas instâncias e confirme que a outra não é afetada.
3. **FR-006 (ack só após sucesso) sem teste unitário dedicado dentro do diff surface.** O comportamento é herdado do `RabbitMQAdapter.consume()`, que não foi alterado por esta feature (confirmado via `git show bcf4be57` — método intocado) — portanto o I-check é MET por inspeção de código pré-existente, mas não há um T-check novo que prove essa ordenação especificamente para o fluxo de broadcast. Risco baixo (comportamento herdado e já coberto por testes pré-existentes de `consume()`), mas vale registrar como lacuna de rastreabilidade explícita.

### Comparação com o QA report existente
O QA report interno (`qa-report-notification-broadcast-fanout.md`) reivindica 11/11 FRs PASSED e 0 bugs. Esta avaliação independente concorda com 10 dos 11 FRs verificados diretamente (FR-001 a FR-006, FR-008 a FR-011), incluindo a nota de ambiente sobre a falha de credenciais Prisma (idêntica em ambos os relatórios). A única divergência é o **FR-007**, marcado "✅ PASSOU" no QA report mas avaliado aqui como parcialmente cumprido (a spec resolve a intenção, mas o mecanismo literal do PRD não existe) — o QA report parece ter validado a resolução da spec sem sinalizar a divergência textual com o PRD original.
