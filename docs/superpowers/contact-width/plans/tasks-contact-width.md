# Tarefas: Ajuste de largura da seção de contato

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/contact-width-design.md`
**PRD:** N/A

**Goal:** Reduzir a largura da seção de contato na landing pública para que fique igual à largura máxima da seção "Escolha seu plano".

**Architecture:** Alteração puramente visual e local: adicionar a utilidade Tailwind `max-w-xl` ao elemento raiz do `ContactSection`, espelhando a configuração já existente em `PlansSectionHero`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest, Biome.

---

## Tarefas

- [x] 1. Aplicar max-w-xl na seção de contato → `task-01.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
