# Tarefas: Margem lateral no bottom sheet de filtros (mobile)

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/sheet-filtros-mobile-padding-design.md`
**PRD:** N/A

**Goal:** Corrigir a margem lateral ausente no corpo do bottom sheet de filtros mobile (Usuários e Check-ins), alinhando o padding do conteúdo (chips + botões) ao padding já existente no título.

**Architecture:** Fix isolado no componente base compartilhado `apps/frontend/src/components/ui/sheet.tsx` — `SheetContent` ganha `px-4`; `SheetHeader`/`SheetFooter` trocam `p-4` por `py-4` para não duplicar o horizontal. Os dois consumidores (`check-in-filter-bar.tsx`, `user-filter-bar.tsx`) não são modificados — herdam o fix automaticamente.

**Tech Stack:** Next.js/React, Tailwind CSS v4, radix-ui (`Dialog` primitive por trás do `Sheet`), Vitest + Testing Library.

---

## Tarefas

- [x] 1. Padding lateral consistente no Sheet base → `task-01.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
