# Tarefas: Backend Deepening Refactors

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/backend-deepening-refactors-design.md`
**PRD:** N/A

**Goal:** Quatro refatorações de aprofundamento arquitetural no apps/backend: tradução centralizada erro→HTTP via DomainError.kind, módulo RouteGuard extraído do FastifyAdapter, limpeza de métodos mortos de Repository e Coordinate compartilhado com cálculo de distância único.

**Architecture:** Clean Architecture + DDD (bounded contexts user/gym/check-in/session/subscription/notification/shared). Erros de negócio passam a declarar categoria semântica (`kind`) traduzida para HTTP por um único módulo de infra. Política de autenticação/autorização sai do adapter Fastify para um seam próprio (RouteGuard) com DI. Nenhuma feature nova; comportamento HTTP muda apenas nas correções de inconsistência documentadas na spec (R1.5).

**Tech Stack:** TypeScript, Fastify, Inversify (IoC), Zod, Vitest, Biome, Prisma, pnpm workspace (Turborepo).

---

## Tarefas

- [x] 1. Remover UserRepository.delete() (interface + 4 implementações) → `task-01.md`
- [x] 2. Remover SubscriptionRepository.ofId()/ofUserId() e migrar 2 testes → `task-02.md`
- [x] 3. Coordinate compartilhado em shared/domain com distanceTo(); deletar DistanceCalculator → `task-03.md`
- [x] 4. Criar DomainError + ErrorKind + tradução kind→status no BaseController → `task-04.md`
- [x] 5. Migrar 27 erros User+Session para DomainError e tratar overrides desses controllers → `task-05.md`
- [x] 6. Migrar 17 erros Gym/CheckIn/Notification/Subscription/Shared e tratar overrides → `task-06.md`
- [x] 7. Remover heurísticas legadas do BaseController e validação final → `task-07.md`
- [x] 8. Criar módulo RouteGuard (interface + JwtRouteGuard + testes unitários + binding IoC) → `task-08.md`
- [x] 9. Integrar RouteGuard no FastifyAdapter e deletar handlers inline → `task-09.md`

## Execution Waves

- **Wave 1** (parallel): 1, 2, 3, 4, 8
- **Wave 2** (parallel): 5, 6, 9
- **Wave 3** (sequential): 7
