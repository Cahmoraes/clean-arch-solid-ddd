# Tarefas: Realtime Notification System

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below), or super.executing-plans to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/realtime-notification-system-design.md`
**PRD:** `../prd/prd-realtime-notification-system.md`

**Goal:** Implementar sistema de notificações em tempo real (SSE + Redis Pub/Sub + RabbitMQ) com painel dropdown no frontend, cobrindo aprovação/rejeição de check-ins e alertas de segurança.

**Architecture:** Backend em Clean Architecture + DDD: bounded context `notification/` com entidade Notification, repositório Prisma, use cases, event handlers e controllers SSE + REST. Redis Pub/Sub faz fan-out para instâncias Fastify via PSUBSCRIBE. Frontend Next.js 16 usa `@microsoft/fetch-event-source` com Bearer token e TanStack Query para REST.

**Tech Stack:** Fastify + Inversify IoC, Prisma ORM, ioredis (pub/sub), RabbitMQ (amqplib), @microsoft/fetch-event-source, TanStack Query v5, Zustand, shadcn/Radix UI

---

## Tarefas

- [ ] 1. CheckInApprovedEvent + events.ts update [RF-020, RF-021] → `task-01.md`
- [ ] 2. Notification entity + domain errors [RF-020, RF-021, RF-022, RF-023] → `task-02.md`
- [ ] 3. NotificationRepository interface [RF-024, RF-025, RF-026, RF-027] → `task-03.md`
- [ ] 4. InMemory notification repository [RF-024, RF-025, RF-026] → `task-04.md`
- [ ] 5. Get notifications + unread count use cases [RF-025, RF-026] → `task-05.md`
- [ ] 6. Mark as read use cases [RF-016, RF-017, RF-018, RF-019] → `task-06.md`
- [ ] 7. CreateNotificationOnCheckIn event handler + queue setup [RF-001, RF-020, RF-021, RF-024] → `task-07.md`
- [ ] 8. Prisma schema + migration [RF-024, RF-027] → `task-08.md`
- [ ] 9. PrismaNotificationRepository [RF-024, RF-025, RF-026, RF-027] → `task-09.md`
- [ ] 10. SseManager + RedisNotificationPublisher + RedisNotificationSubscriber [RF-001, RF-002, RF-004] → `task-10.md`
- [ ] 11. IoC wiring + bootstrap [RF-001, RF-002] → `task-11.md`
- [ ] 12. REST notification controllers [RF-003, RF-016, RF-018, RF-025, RF-026] → `task-12.md`
- [ ] 13. SSE stream controller [RF-001, RF-002, RF-003, RF-004, RF-005] → `task-13.md`
- [ ] 14. Generate shared API types [RF-003, RF-025] → `task-14.md`
- [ ] 15. Frontend SSE hook + @microsoft/fetch-event-source [RF-001, RF-002, RF-003] → `task-15.md`
- [ ] 16. Frontend useNotifications hook [RF-006, RF-007, RF-008, RF-009, RF-016, RF-017, RF-018, RF-019] → `task-16.md`
- [ ] 17. Frontend NotificationBell + Dropdown components [RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-017, RF-018, RF-019] → `task-17.md`

## Execution Waves

- **Wave 1** (parallel): 1, 2, 8
- **Wave 2** (sequential): 3
- **Wave 3** (parallel): 4, 9
- **Wave 4** (parallel): 5, 6, 7
- **Wave 5** (sequential): 10
- **Wave 6** (sequential): 11
- **Wave 7** (sequential): 12
- **Wave 8** (sequential): 13
- **Wave 9** (sequential): 14
- **Wave 10** (sequential): 15
- **Wave 11** (sequential): 16
- **Wave 12** (sequential): 17
