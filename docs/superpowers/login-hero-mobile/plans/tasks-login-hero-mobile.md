# Tarefas: Hero da Tela de Login Adaptado para Mobile

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/login-hero-mobile-design.md`
**PRD:** N/A

> Spec-only planning; no FR traceability available.

**Goal:** Exibir o conteúdo hero da tela de login (título "Treine onde você estiver." + estatísticas 312/48k/4.9) em viewports mobile (≤860px) como um bloco compacto acima do formulário, hoje completamente ocultado.

**Architecture:** Mudança confinada a `apps/frontend/src/app/(public)/login/page.tsx`. Abordagem 1: extrair um array `LOGIN_STATS` no escopo do módulo como fonte única dos dados das estatísticas, consumido tanto pelo `<aside>` desktop (refatoração sem mudança visual) quanto por um novo bloco hero mobile (`hidden max-[860px]:flex`) inserido acima do formulário. Toggle de CSS puro, sem JS de viewport.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Vitest + Testing Library, Biome.

---

## Tarefas

- [ ] 1. Extrair `LOGIN_STATS` e refatorar o aside desktop → `task-01.md`
- [ ] 2. Adicionar bloco hero mobile e ajustar os testes → `task-02.md`

## Ondas de Execução

<!--
  Ambas as tarefas modificam o mesmo arquivo (page.tsx) e a task-02 consome o
  LOGIN_STATS criado na task-01 — cadeia estritamente sequencial. A opção de
  execução paralela não oferece ganho neste plano.
-->

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
