# Tarefas: user-detail-panel-ux

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/user-detail-panel-ux-design.md`
**PRD:** `../prd/prd-user-detail-panel-ux.md`

**Goal:** Redesenhar o painel de detalhes do usuário admin para eliminar o espaço vazio com layout sticky e reorganizar as ações em dropdown com hierarquia de risco.

**Architecture:** Três mudanças coordenadas em `apps/frontend/src/features/admin/components/user-detail/`: (1) classes CSS sticky adicionadas ao wrapper desktop de `UserDetailContainer`; (2) novo componente `MoreActionsMenu` com `DropdownMenu` shadcn/ui e itens coloridos por nível de risco; (3) `UserActionsFooter` simplificado para layout puro delegando ações ao `MoreActionsMenu`.

**Tech Stack:** React 19, Next.js 16, shadcn/ui (Radix), Tailwind CSS v4, Vitest + @testing-library/react, happy-dom

---

## Tarefas

- [x] 1. Sticky layout no UserDetailContainer [FR-001, FR-002, FR-003, FR-004] → `task-01.md`
- [x] 2. Componente MoreActionsMenu [FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-016] → `task-02.md`
- [x] 3. Refatorar UserActionsFooter [FR-005, FR-006, FR-014, FR-015] → `task-03.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (sequential): 3
