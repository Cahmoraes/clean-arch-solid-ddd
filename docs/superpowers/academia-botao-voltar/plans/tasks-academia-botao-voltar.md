# Tarefas: Botão voltar na edição de academia

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/academia-botao-voltar-design.md`
**PRD:** `N/A`

**Goal:** Adicionar um link "Voltar para a busca" no topo da tela de edição de academia e renomear o botão "Cancelar" para "Descartar alterações", replicando o padrão da tela de detalhes.

**Architecture:** Mudança local em uma página Next.js App Router. Reutiliza componentes e padrões já existentes (`next/link`, `lucide-react`, shadcn/ui `Button`). Os testes existentes são atualizados para refletir o novo rótulo e o novo link.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Testing Library, MSW.

---

## Tarefas

- [ ] 1. Adicionar link voltar e renomear botão cancelar na edição de academia → `task-01.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
