# Tarefas: Remoção do Redis Pub/Sub do Broadcast de Notificações (RabbitMQ Fanout)

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/notification-broadcast-fanout-design.md`
**PRD:** `../prd/prd-notification-broadcast-fanout.md`

**Goal:** Remover o Redis Pub/Sub do broadcast de notificações em tempo real do bounded context `notification` e consolidar durabilidade + broadcast multi-instância inteiramente no RabbitMQ, sem regressão de funcionalidade.

**Architecture:** A fila durável `notificationCreated` (RabbitMQ, inalterada) continua recebendo cada notificação criada. O `NotificationQueueWorker` deixa de publicar no Redis e passa a publicar em uma nova exchange fanout `notificationBroadcast` via `NotificationBroadcastPublisher`. Cada instância Fastify declara, ao subir, uma fila exclusiva/auto-delete vinculada a essa exchange via `NotificationBroadcastSubscriber` (usando `amqp-connection-manager` para redeclaração automática em reconexões), repassando cada mensagem ao `SseManager` local (inalterado).

**Tech Stack:** TypeScript, Fastify, Inversify (IoC), `amqplib` 2.0.1, `amqp-connection-manager` (nova dependência), Vitest.

---

## Tarefas

- [x] 1. Adicionar dependência `amqp-connection-manager` [FR-004] → `task-01.md`
- [x] 2. Generalizar `RabbitMQAdapter.publish` para aceitar tipo de exchange (`direct` default, `fanout`) [FR-008, FR-009] → `task-02.md`
- [x] 3. Adicionar exchange `NOTIFICATION_BROADCAST` e novos symbols Inversify [FR-009] → `task-03.md`
- [x] 4. Criar `NotificationBroadcastPublisher` [FR-001] → `task-04.md`
- [x] 5. Atualizar `NotificationQueueWorker` para publicar via `NotificationBroadcastPublisher` [FR-001, FR-005, FR-006] → `task-05.md`
- [x] 6. Criar `NotificationBroadcastSubscriber` com `amqp-connection-manager` [FR-002, FR-003, FR-004] → `task-06.md`
- [x] 7. Atualizar IoC e bootstrap para os novos componentes [FR-010, FR-011] → `task-07.md`
- [x] 8. Remover componentes Redis Pub/Sub obsoletos [FR-010, FR-011] → `task-08.md`
- [x] 9. Teste de integração multi-instância (fanout real via RabbitMQ) [FR-002, FR-003, FR-004, FR-007] → `task-09.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3
- **Wave 2** (parallel): 4, 6
- **Wave 3** (sequential): 5
- **Wave 4** (sequential): 7
- **Wave 5** (parallel): 8, 9
