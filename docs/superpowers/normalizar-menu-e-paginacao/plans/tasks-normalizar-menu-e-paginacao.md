# Tarefas: Normalizar menu lateral fixo e paginação numerada

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/normalizar-menu-e-paginacao-design.md`
**PRD:** N/A (spec-only planning; no FR traceability available)

**Goal:** Corrigir o bug de scroll do menu lateral e normalizar a paginação de `/academias` e `/check-ins` para usar números de página clicáveis, igual a `/admin/usuarios`.

**Architecture:** Backend passa a expor `total` nos endpoints `GET /gyms` e `GET /gyms/search/{name}` (seguindo o padrão já usado em `/users`). Frontend extrai um componente `NumberedPagination` reutilizável a partir da lógica já existente em `UsersPagination` e o aplica também em `/academias` e `/check-ins`. O bug do menu lateral é corrigido isoladamente com `min-h-0` na cadeia flex do layout.

**Tech Stack:** Fastify + Prisma + Zod + Inversify (backend); Next.js 16 + React 19 + TanStack Query + Tailwind v4 + shadcn/ui (frontend); Vitest + Testing Library + MSW (testes).

---

## Tarefas

- [x] 1. Backend — GymRepository retorna total de registros → `task-01.md`
- [x] 2. Backend — Use cases de academias repassam paginação → `task-02.md`
- [x] 3. Backend — Controllers de academias respondem com paginação → `task-03.md`
- [x] 4. Regenerar tipos compartilhados (`@repo/api-types`) → `task-04.md`
- [x] 5. Frontend — Hooks de academias consomem resposta paginada → `task-05.md`
- [x] 6. Frontend — Componente `NumberedPagination` compartilhado + refactor de `/admin/usuarios` → `task-06.md`
- [x] 7. Frontend — `/academias` usa `NumberedPagination` com total real → `task-07.md`
- [x] 8. Frontend — `/check-ins` usa `NumberedPagination` → `task-08.md`
- [x] 9. Frontend — Corrigir scroll do menu lateral (`min-h-0`) → `task-09.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 6, 9
- **Wave 2** (parallel): 2, 8
- **Wave 3** (sequential): 3
- **Wave 4** (sequential): 4
- **Wave 5** (sequential): 5
- **Wave 6** (sequential): 7
