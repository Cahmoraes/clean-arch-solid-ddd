# Tarefas: Global Command Palette

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/global-command-palette-design.md`
**PRD:** `../prd/prd-global-command-palette.md`

**Goal:** Implementar um Command Palette global (`⌘K`) no frontend que unifica navegação entre páginas e busca de registros (academias e usuários admin) em um modal acessível, acionado pelo SearchBar do header ou pelo atalho de teclado.

**Architecture:** CommandPalette modal com `cmdk` + Radix Dialog. Estado `isOpen` em `AuthenticatedShell`. Cada grupo de resultado (`NavigationGroup`, `GymGroup`, `UserGroup`) é um componente independente que gerencia seus próprios dados. `useGlobalSearch` provê debounce 300ms e flag `isActive`. Filtro de role no client (UserGroup só renderiza para ADMIN).

**Tech Stack:** Next.js 16 App Router, cmdk, @radix-ui/react-dialog, TanStack Query, Zustand (useAuthStore), Vitest + Testing Library, MSW

---

## Tarefas

- [ ] 1. Install cmdk + CommandPalette shell + SearchBar onClick + AuthenticatedShell wiring [RF-001, RF-002, RF-003, RF-004, RF-005, RF-022, RF-023, RF-024, RF-025, RF-026] → `task-01.md`
- [ ] 2. NavigationGroup — itens estáticos filtrados por role [RF-006, RF-007, RF-008, RF-009] → `task-02.md`
- [ ] 3. useGlobalSearch + GymGroup [RF-010, RF-011, RF-012, RF-013, RF-014] → `task-03.md`
- [ ] 4. UserGroup (admin only) [RF-016, RF-017, RF-018, RF-019, RF-020] → `task-04.md`
- [ ] 5. Wire all groups + page URL params [RF-015, RF-021] → `task-05.md`

## Execution Waves

- **Wave 1** (sequential): 1
- **Wave 2** (parallel): 2, 3
- **Wave 3** (sequential): 4
- **Wave 4** (sequential): 5
