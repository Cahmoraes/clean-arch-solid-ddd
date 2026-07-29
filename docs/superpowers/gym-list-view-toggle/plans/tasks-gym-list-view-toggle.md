# Tarefas: Toggle de Visualização em Linhas para Academias

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-list-view-toggle-design.md`
**PRD:** N/A

<!-- Spec-only planning; no FR traceability available. -->

**Goal:** Adicionar à tela `/academias` uma visualização em linhas alternativa ao grid de cards, com um toggle (segmented control com ícones) que persiste a escolha em cookie e sobrevive a reloads.

**Architecture:** Store Zustand (`GymViewStore`) + módulo de cookie (`gym-view-cookie.ts`) replicam o padrão já existente do toggle de sidebar. `GymResults` passa a escolher `GymCard` ou o novo `GymRow` por item conforme o `view` do store. A hidratação do cookie é client-only, feita dentro de `AcademiasContent` via ref-guard (sem split server/client de `page.tsx`). `SegmentedControl` é reusado para o toggle, com o tipo de `label` ampliado de `string` para `ReactNode` (mudança aditiva) para aceitar ícones.

**Tech Stack:** Next.js (App Router, client components), Zustand, TypeScript, Tailwind, lucide-react (`LayoutGrid`, `List`), Vitest + Testing Library, MSW.

---

## Tarefas

- [x] 1. Extrair `resolveLocation` para módulo compartilhado → `task-01.md`
- [x] 2. Criar módulo de cookie `gym-view-cookie.ts` → `task-02.md`
- [x] 3. Criar `GymViewStore` (Zustand) → `task-03.md`
- [x] 4. Ampliar `SegmentedControl.label` de `string` para `ReactNode` → `task-04.md`
- [x] 5. Criar `GymRow` com paridade de conteúdo com `GymCard` → `task-05.md`
- [x] 6. Modificar `GymResults` para alternar entre `GymCard`/`GymRow` conforme o store → `task-06.md`
- [x] 7. Adicionar toggle e hidratação client-only em `AcademiasContent` → `task-07.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 4
- **Wave 2** (parallel): 3, 5
- **Wave 3** (parallel): 6, 7
