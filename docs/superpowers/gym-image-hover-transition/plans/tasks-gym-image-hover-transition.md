# Tarefas: gym-image-hover-transition

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-image-hover-transition-design.md`
**PRD:** N/A

**Goal:** Suavizar a transição de hover da imagem de capa no `GymCard` trocando `ease-out 300ms scale-1.07` por `ease-in-out 500ms scale-1.05` no componente `GymImage`.

**Architecture:** Spec-only planning; no FR traceability available. Alteração mínima restrita ao `<img>` dentro de `GymImage` — nenhum outro componente é afetado. O card (`GymCard`) e seus outros estilos de hover permanecem intactos.

**Tech Stack:** React 19, Tailwind CSS v4, Vitest + Testing Library

---

## Tarefas

- [x] 1. Suavizar transição de hover da imagem → `task-01.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
