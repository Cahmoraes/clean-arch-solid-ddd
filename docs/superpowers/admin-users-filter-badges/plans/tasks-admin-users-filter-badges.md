# Tarefas: admin-users-filter-badges

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/admin-users-filter-badges-design.md`
**PRD:** `../prd/prd-admin-users-filter-badges.md`

**Goal:** Exibir badges de contagem flutuantes (FloatBadge) nos pills de filtro da página `/admin/usuarios`, sem badge durante o carregamento das stats.

**Architecture:** Ajuste na prop `counts: UserStats` (required) de `UserFilterBar` para `stats?: UserStats` (opcional) com `countFloat={stats !== undefined}`, alinhando ao padrão já adotado em `CheckInFilterBar`. A página admin remove o fallback `EMPTY_STATS` e passa `stats={statsData}` diretamente. Os hooks de mutação já invalidam `USER_STATS_QUERY_KEY` — RF-009..RF-011 estão implementados e não precisam de task.

**Tech Stack:** React 19, TanStack Query v5, Vitest + Testing Library, Tailwind CSS v4, shadcn/ui (`SegmentedControl`)

---

## Tarefas

- [ ] 1. Refatorar `UserFilterBar` — prop opcional e FloatBadge [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008] → `task-01.md`
- [ ] 2. Atualizar página admin `/admin/usuarios` — remover EMPTY_STATS [RF-001, RF-005, RF-006, RF-007] → `task-02.md`

> **Nota RF-009, RF-010, RF-011:** Invalidação de cache após mutações já está implementada. Todos os hooks (`usePromoteToAdmin`, `useDemoteFromAdmin`, `useDeleteUser`, `useSuspendUser`, `useActivateUser`) chamam `queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })` no `onSettled`. Nenhuma task adicional necessária.

## Execution Waves

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
