# AC Baseline (congelado) — notification-broadcast-fanout

> Checklist de critérios de aceite congelado ANTES da coleta de evidências definitiva. Não editar após congelamento — qualquer revisão deve ser registrada como nova entrada no relatório final, não aqui.

**Fonte**: PRD (`../prd/prd-notification-broadcast-fanout.md`, US-01 a US-05, FR-001 a FR-011) + spec de design (`../specs/notification-broadcast-fanout-design.md`, Decisões D1-D4).

**Prioridade**: o PRD não traz rótulos explícitos P0/P1/P2 → prioridade marcada como **ASSUMED** para todas as 5 histórias (feature de infraestrutura crítica de entrega em tempo real, tratada como P0 por padrão, peso 3).

---

## AC-US01 — Broadcast em tempo real via RabbitMQ fanout (substitui Redis pub/sub)
Mapeia: FR-001, FR-002, FR-005, FR-006, FR-010, FR-011. Prioridade: P0 (ASSUMED).

**I-checks:**
1. `NotificationQueueWorker` publica broadcast via `NotificationBroadcastPublisher` (não mais Redis)
2. `NotificationBroadcastPublisher` publica na exchange fanout, `durable:false`
3. `NotificationBroadcastSubscriber` repassa a mensagem para `SseManager.send`
4. Payload conjunction preservado ponta-a-ponta (notificationId/userId/type/title/message)
5. `RedisNotificationPublisher`/`RedisNotificationSubscriber` removidos
6. Outros usos de Redis (rate-limit, BullMQ, redis-adapter compartilhado) não afetados

**T-checks (testáveis; itens 5/6 são checks estruturais de ausência, sem alvo de teste unitário natural):**
1. (unit) worker publica via broadcast publisher
2. (unit) publisher publica payload correto na exchange fanout `durable:false`
3. (unit) subscriber repassa payload para `SseManager.send`
4. (integration, RabbitMQ real) mesma mensagem entregue a duas instâncias assinantes independentes

## AC-US02 — Reconexão/catch-up de notificações
Mapeia: FR-007. Prioridade: P0 (ASSUMED).

**Nota de resolução (congelada antes da coleta):** o PRD menciona literalmente "catch-up via Last-Event-ID", mas a spec de design declara explicitamente que esse mecanismo "não existe hoje" e está "fora do escopo criar aqui" — resolvendo a lacuna via re-fetch em `GET /api/v1/notifications` após reconexão. Este baseline adota a leitura da spec (mais operacional) como autoritativa para os I-checks, mas mantém um T-check dedicado para o literal do PRD (Last-Event-ID) para não mascarar a divergência.

**I-checks:**
1. `GET /api/v1/notifications` preservado e funcional como caminho de catch-up (leitura resolvida pela spec)
2. Nenhum mecanismo de Last-Event-ID é implementado nem falsamente reivindicado (consistente com "fora de escopo" da spec)

**T-checks:**
1. (e2e/business-flow) `GET /api/v1/notifications` retorna lista de notificações do usuário
2. (unit/e2e) mecanismo de catch-up via header `Last-Event-ID` no endpoint SSE — literal do PRD

## AC-US03 — Broadcast multi-instância depende apenas de RabbitMQ (remoção do Redis Pub/Sub)
Mapeia: FR-010, FR-011. Prioridade: P0 (ASSUMED).

**I-checks:**
1. Diretório/arquivos `RedisNotificationPublisher`/`RedisNotificationSubscriber` removidos do código-fonte
2. Zero referências residuais a esses componentes em todo o monorepo (bindings IoC, testes, imports)

**T-checks:**
1. (gate) build + tsc:check limpos comprovam ausência de imports quebrados/pendentes após a remoção

## AC-US04 — Engenharia: fanout real multi-instância via RabbitMQ
Mapeia: FR-002, FR-003, FR-004, FR-007. Prioridade: P0 (ASSUMED).

**I-checks:**
1. Duas instâncias de subscriber declaram filas exclusivas/auto-delete independentes vinculadas à mesma exchange fanout
2. A mesma mensagem publicada é entregue a ambas as instâncias

**T-checks:**
1. (integration, RabbitMQ real, isolado) `notification-broadcast.integration-test.ts` comprova entrega idêntica a duas instâncias independentes

## AC-US05 — Engenharia: `RabbitMQAdapter` generalizado para tipo/durabilidade de exchange
Mapeia: FR-008, FR-009. Prioridade: P0 (ASSUMED).

**I-checks:**
1. `Queue.publish`/`RabbitMQAdapter.publish` aceita parâmetro de tipo de exchange (`direct` default, `fanout` explícito)
2. `publish` aceita parâmetro de durabilidade
3. Chamadores/implementações pré-existentes (`BullMQAdapter`, `QueueMemoryAdapter`, chamadas de exchanges diretas já existentes) permanecem compatíveis via parâmetros opcionais (tipagem estrutural TS)

**T-checks:**
1. (unit) `rabbitmq-adapter.test.ts` — comportamento default (`direct`/durable)
2. (unit) `rabbitmq-adapter.test.ts` — comportamento explícito (`fanout`/`durable:false`)

---

**Regra de congelamento**: os itens acima foram fixados antes da pontuação final. Qualquer resultado que altere a interpretação (ex.: AC-US02 — item 2 do T-check, sabidamente inexistente) é registrado no relatório final como gap, não usado para reescrever este checklist.
