# Tarefas: UI Polish — Paginação e Select de Status

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/ui-pagination-select-polish-design.md`
**PRD:** N/A — Spec-only planning; no FR traceability available.

**Goal:** Corrigir dois problemas visuais pontuais: paginação com texto apertado e select de status/role com seta nativa inconsistente entre browsers.

**Architecture:** Dois componentes frontend totalmente independentes. `pagination.tsx` é um componente base de UI reutilizável; `details-edit-form.tsx` é específico da feature admin. Nenhuma mudança de API, lógica de negócio ou dependências externas.

**Tech Stack:** React 19, Tailwind CSS v4, lucide-react, shadcn/ui (button variants), Vitest + Testing Library.

---

## Tarefas

- [ ] 1. Paginação — substituir botões Anterior/Próxima por ícones → `task-01.md`
- [ ] 2. Select de Status/Role — appearance-none + ChevronDown custom → `task-02.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
