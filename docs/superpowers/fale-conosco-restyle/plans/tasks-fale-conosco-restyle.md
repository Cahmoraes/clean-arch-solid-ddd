# Tarefas: Restyle da Seção Fale Conosco

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/fale-conosco-restyle-design.md`
**PRD:** N/A

**Goal:** Reestilizar a seção "Fale Conosco" da home para o formulário ocupar a linha inteira no desktop, com a informação de contato em 2 cards abaixo do form.

**Architecture:** Mudança de apresentação pura (markup + Tailwind v4) em 2 componentes existentes do feature de contato. A lógica de envio (react-hook-form + zod + TanStack Query `useSendContact`) fica intacta. Nenhuma abstração nova; os cards de contato ficam inline na section (RSC server-safe). A seção ganha o primeiro teste (`contact-section.test.tsx`); o form ganha `autocomplete` (WCAG) e campos lado a lado no desktop.

**Tech Stack:** React 19, Next.js 16 (RSC + client components), Tailwind CSS v4, shadcn/ui (Card, Button), lucide-react, react-hook-form + zod, TanStack Query, Vitest + happy-dom + MSW.

---

## Tarefas

- [x] 1. Restyle da seção (form full-width + cards de contato) → `task-01.md`
- [x] 2. Form: campos lado a lado + autocomplete + botão full-width → `task-02.md`

<!-- Nota: sem PRD — planejamento spec-only; sem tags [FR-XXX]. -->

## Ondas de Execução

- **Wave 1** (parallel): 1, 2

## Verificação (conjunto completo de comandos)

- `pnpm --filter frontend lint:fix` — Biome com zero problemas
- `pnpm --filter frontend tsc:check` — TypeScript sem erros
- `pnpm --filter frontend test -- --run` — suite unit do frontend (Vitest + happy-dom + MSW)
- `pnpm --filter frontend build` — build de produção do Next.js

## Alcance / mudança aditiva

`page.tsx` importa `ContactSection` e não está no write-set de nenhuma task. A mudança é **aditiva**: o export `ContactSection()` permanece sem props e o contrato `aria-labelledby="contact-heading"` é preservado — `page.tsx` não precisa de alteração.
