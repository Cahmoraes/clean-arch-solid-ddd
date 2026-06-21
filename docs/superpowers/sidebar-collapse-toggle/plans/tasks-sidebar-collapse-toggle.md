# Tarefas: Sidebar Recolhível (Collapse/Expand)

**For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see `## Ondas de Execução`) to implement tasks. Progress is tracked at task level via the checkbox list below — each task file has the full implementation steps.

**Spec:** `../specs/sidebar-collapse-toggle-design.md`
**PRD:** `../prd/prd-sidebar-collapse-toggle.md`

**Goal:** Permitir que o usuário recolha/expanda o menu lateral do `AuthenticatedShell` (trilho de ícones 76px ↔ 268px), persistindo a preferência em cookie lido no servidor (sem flicker), via toggle e atalho `Cmd/Ctrl+B`, apenas no desktop.

**Architecture:** Estende o shell custom existente. Um store Zustand (`sidebar-collapse-store`) é a fonte de verdade no client; um módulo client-safe (`sidebar-collapse-cookie`) detém o nome do cookie e a escrita; o `(authenticated)/layout.tsx` (server) lê o cookie e injeta `defaultCollapsed`. A largura é dirigida pelo estado com transição CSS; a media query `max-[860px]` continua dona do trilho forçado no mobile.

**Tech Stack:** Next.js 16 (App Router, `next/headers`), React 19, Zustand 5, Tailwind CSS v4, lucide-react, Vitest + Testing Library + MSW, Playwright.

---

## Tarefas

- [ ] 1. Cookie client-safe + store Zustand de recolhimento [FR-005, FR-007] → `task-01.md`
- [ ] 2. Recolher/expandir no AuthenticatedShell (UI, a11y, toggle, atalho, tooltips) [FR-001, FR-002, FR-003, FR-004, FR-006, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013] → `task-02.md`
- [ ] 3. Leitura do cookie no layout server (sem flicker) [FR-005, FR-006, FR-007] → `task-03.md`
- [ ] 4. E2E de persistência após reload [FR-005, FR-006] → `task-04.md`

## Ondas de Execução

- **Wave 1 (sequential):** task-01
- **Wave 2 (sequential):** task-02
- **Wave 3 (sequential):** task-03
- **Wave 4 (sequential):** task-04

> Cadeia inteiramente dependente: task-02 consome o store da task-01; task-03 consome o prop `defaultCollapsed` da task-02 e o cookie da task-01; task-04 valida tudo de ponta a ponta. A opção de execução paralela não oferece ganho de tempo aqui — todas as waves são sequenciais.
