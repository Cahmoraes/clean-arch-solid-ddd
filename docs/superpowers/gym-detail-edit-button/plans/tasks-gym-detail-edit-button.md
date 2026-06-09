# Tarefas: Botão editar no detalhe da academia

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-detail-edit-button-design.md`
**PRD:** N/A

**Goal:** Adicionar botão de edição sobreposto à imagem de capa na tela de detalhe da academia (`/academias/[id]`), visível apenas para admin, seguindo o padrão visual e arquitetural do `GymCard`.

**Architecture:** `GymDetailPage` lê `isAdmin` via `useAuthStore` e deriva `adminEditHref`; passa por `DetailBody` até `DetailCard`, que envolve `GymImage` em wrapper `relative` e renderiza `<Link>` de edição `absolute right-3 top-3 z-20`. `DetailCard` permanece agnóstico de auth (recebe prop `adminEditHref?: string`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, lucide-react (`Pencil`), Zustand (`useAuthStore`), Vitest + Testing Library + MSW.

---

## Tarefas

- [ ] 1. Testes: casos TDD para botão editar no detalhe → `task-01.md`
- [ ] 2. Implementação: `DetailCard`, `DetailBody` e `GymDetailPage` → `task-02.md`

## Ondas de Execução

<!--
  Task 2 depende de task 1 (TDD: testes escritos antes da implementação).
  Cadeia sequencial pura — sem paralelismo disponível.
-->

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
