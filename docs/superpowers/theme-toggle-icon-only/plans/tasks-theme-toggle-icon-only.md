# Tarefas: Theme Toggle Icon Only

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/theme-toggle-icon-only-design.md`
**PRD:** N/A (spec-only planning; no FR traceability available)

**Goal:** Remover o texto "Claro"/"Escuro" do `ThemeToggle` do header, deixando os ícones Sun/Moon comunicarem o estado sozinhos, com uma leve transição de ícone na troca de tema.

**Architecture:** Mudança isolada no componente `ThemeToggle` (`apps/frontend/src/components/ui/theme-toggle.tsx`): remove os spans de texto e a lógica de breakpoint, reduz a largura do pill, adiciona uma animação CSS leve no ícone (respeitando `prefers-reduced-motion`) seguindo o padrão de `@media (prefers-reduced-motion: no-preference)` já usado em `globals.css` (`.route-fade`, `.shimmer`). Testes atualizados via TDD.

**Tech Stack:** Next.js 16 / React 19, next-themes, lucide-react, Tailwind v4, Vitest + Testing Library (happy-dom).

---

## Tarefas

- [x] 1. Remover texto do ThemeToggle e animar ícone na troca de tema → `task-01.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
