# Tarefas: Mobile Responsive Layout

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/mobile-responsive-layout-design.md`
**PRD:** `../prd/prd-mobile-responsive-layout.md`

**Goal:** Tornar as telas de check-ins, usuários e dashboard totalmente funcionais em mobile (<768px) adicionando filtros em Sheet bottom-sheet e tornando os cards do dashboard responsivos.

**Architecture:** CSS-only toggle (`hidden md:block` / `flex md:hidden`) para trocar entre layout desktop e mobile sem JS de layout. Sheet do shadcn/ui (Radix Dialog) para filtros mobile. Todo estado de filtros permanece na URL via `useCheckInFilters`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui Sheet, @radix-ui/react-dialog (já instalado), Vitest + Testing Library

---

## Tarefas

- [x] 1. Instalar Sheet component [FR-002] → `task-01.md`
- [x] 2. CheckInFilterBar — versão mobile com Sheet [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006] → `task-02.md`
- [x] 3. UserFilterBar — versão mobile com Sheet [FR-007] → `task-03.md`
- [x] 4. Member check-ins — corrigir espaçamento filtro/busca [FR-008] → `task-04.md`
- [x] 5. StatusDonutCard — layout responsivo [FR-009, FR-010] → `task-05.md`
- [x] 6. ProfileHeroCard — layout responsivo [FR-011, FR-012] → `task-06.md`
- [x] 7. WeeklyChart + tipografia — responsividade [FR-013, FR-014] → `task-07.md`

## Execution Waves

- **Wave 1** (parallel): 1, 4, 5, 6, 7
- **Wave 2** (parallel): 2, 3
