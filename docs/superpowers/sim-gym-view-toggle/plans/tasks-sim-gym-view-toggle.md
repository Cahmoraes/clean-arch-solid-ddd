# Tarefas: Toggle de Visualização (Grid/Lista) em /academias

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/sim-gym-view-toggle-design.md`
**PRD:** `../prd/prd-sim-gym-view-toggle.md`

**Goal:** Adicionar um controle de alternância grid/lista na busca de `/academias`, com a escolha do usuário persistida por cookie (SSR-safe) entre reloads e visitas futuras, sem flash visual no primeiro carregamento.

**Architecture:** Cookie SSR-safe (`gym-view-cookie.ts`) + store Zustand global (`gym-view-store.ts`) espelhando 1:1 o par já existente `sidebar-collapse-cookie.ts`/`sidebar-collapse-store.ts`. `SearchBar` ganha uma instância de `SegmentedControl` ligada ao store. `GymResults` lê `view` do store e escolhe entre `GymCard` (grid, já existe) e `GymRow` (lista, novo). `(authenticated)/layout.tsx` lê o cookie no servidor e passa `defaultGymView` para `AuthenticatedShell`, que hidrata o store — eliminando o flash.

**Tech Stack:** Next.js (App Router, Server Components), React 18+, TypeScript, Zustand, Vitest + Testing Library (`happy-dom`), Tailwind.

---

## Tarefas

- [ ] 1. Persistência da preferência de visualização (cookie + store) [FR-005, FR-006, FR-007] → `task-01.md`
- [ ] 2. Hidratação SSR sem flash (layout + shell) [FR-008] → `task-02.md`
- [ ] 3. Controle de alternância na busca (SearchBar + SegmentedControl) [FR-001, FR-002, FR-003, FR-004] → `task-03.md`
- [ ] 4. Visualização em lista (GymRow + GymResults) [FR-009, FR-010, FR-011] → `task-04.md`

## Ondas de Execução

<!--
  Derived from each task's **Depends on:** field via topological grouping.
  Task 1 creates gym-view-cookie.ts + gym-view-store.ts (no deps). Tasks 2, 3 and 4 each
  read/call the real implementation of the store (hydrate/getState/setView) that task 1
  produces, but touch fully disjoint files from one another:
    - Task 2: apps/frontend/src/app/(authenticated)/layout.tsx,
              apps/frontend/src/components/layout/authenticated-shell.tsx
    - Task 3: apps/frontend/src/components/ui/search-bar.tsx (+ its existing test)
    - Task 4: apps/frontend/src/features/gyms/components/gym-row.tsx (+ test),
              apps/frontend/src/features/gyms/components/gym-results.tsx (+ test)
  No pair among 2/3/4 depends on another — none imports, extends, or reads a file the
  others create. Genuinely independent: Wave 2 is a real 3-way parallel fan-out.
-->

- **Wave 1** (sequential): 1
- **Wave 2** (parallel): 2, 3, 4
