# Tarefas: users-list-filters

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/users-list-filters-design.md`
**PRD:** `../prd/prd-users-list-filters.md`

**Goal:** Adicionar filtros por categoria de usuário com contadores ao painel admin, ajustando a largura do layout e incluindo suporte no backend.

**Architecture:** Backend recebe dois novos artefatos — `GetUserStatsUseCase` (novo) e extensão do `FetchUsersUseCase` com filtros `role`/`status`. Frontend recebe `UserFilterBar` (novo componente), `useUserStats` (novo hook) e extensão do `useUsers`. Ambos conectados via `@repo/api-types` regenerado após mudanças no backend.

**Tech Stack:** Backend: Fastify + Inversify + Prisma + Redis (cache) + Zod (schema) + Vitest. Frontend: Next.js 16 + TanStack Query + shadcn/ui + Tailwind v4 + MSW + Vitest.

---

## Tarefas

- [ ] 1. Backend — Estender UserDAO com método de stats e filtros role/status [RF-014, RF-017, RF-018, RF-019, RF-020] → `task-01.md`
- [ ] 2. Backend — GetUserStatsUseCase [RF-014, RF-015] → `task-02.md`
- [ ] 3. Backend — Estender FetchUsersUseCase com filtros role/status [RF-017, RF-018, RF-019, RF-020] → `task-03.md`
- [ ] 4. Backend — GetUserStatsController + IoC [RF-014, RF-015] → `task-04.md`
- [ ] 5. Backend — Estender FetchUsersController com params role/status [RF-017, RF-018, RF-019, RF-020] → `task-05.md`
- [ ] 6. Shared — Regenerar tipos da API [RF-003, RF-007] → `task-06.md`
- [ ] 7. Frontend — Ajuste de largura do layout [RF-001] → `task-07.md`
- [ ] 8. Frontend — Tipos UserFilter + componente UserFilterBar [RF-002, RF-003, RF-005, RF-006] → `task-08.md`
- [ ] 9. Frontend — Hook useUserStats [RF-003, RF-004, RF-016] → `task-09.md`
- [ ] 10. Frontend — Estender useUsers com filtro de categoria [RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013] → `task-10.md`
- [ ] 11. Frontend — Integrar tudo na AdminUsersPage [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-012, RF-013, RF-016] → `task-11.md`
