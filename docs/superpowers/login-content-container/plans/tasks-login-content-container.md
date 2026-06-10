# Tarefas: Login Content Container

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/login-content-container-design.md`
**PRD:** N/A

**Goal:** Envolver o grid de duas colunas da tela de login em um container `max-w-6xl` centralizado, alinhando os limites laterais do conteúdo com o header e o footer do `PublicShell`.

**Architecture:** Adicionar um `<div className="mx-auto w-full max-w-6xl">` ao redor do `<div className="grid ...">` dentro do componente `LoginForm` em `login/page.tsx`. Nenhum novo componente, nenhuma alteração no `PublicShell`. Spec-only planning; no FR traceability available.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Vitest + Testing Library.

---

## Tarefas

- [ ] 1. Implementar container `max-w-6xl` na tela de login + verificação → `task-01.md`

## Execution Waves

- **Wave 1** (sequential): 1
