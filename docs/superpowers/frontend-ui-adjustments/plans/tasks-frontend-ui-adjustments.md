# Tarefas: Frontend UI Adjustments

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below), or super.executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/frontend-ui-adjustments-design.md`
**PRD:** N/A

**Goal:** Aplicar quatro ajustes visuais pontuais no frontend após o redesign VOLT: botão Sair no menu lateral, filtro de check-ins em largura total, campo de busca de usuários em largura total e animações de hover suavizadas nas listagens.

**Architecture:** Mudanças isoladas em componentes React existentes via Tailwind CSS. Nenhuma alteração de dados, API ou lógica de negócio. Todos os arquivos afetados são independentes entre si.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library

---

Spec-only planning; no RF traceability available.

## Tarefas

- [x] 1. Logout como nav item na sidebar → `task-01.md`
- [x] 2. Filtro de check-ins em largura total → `task-02.md`
- [x] 3. Campo de busca de usuários em largura total → `task-03.md`
- [x] 4. Suavizar animação de hover nas listagens → `task-04.md`

## Execution Waves

- **Wave 1** (parallel): 1, 2, 3, 4
