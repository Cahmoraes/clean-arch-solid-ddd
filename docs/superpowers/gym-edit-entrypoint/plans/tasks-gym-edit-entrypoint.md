# Tarefas: Ponto de entrada para edição de academia

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-edit-entrypoint-design.md`
**PRD:** N/A (Spec-only planning; no FR traceability available)

**Goal:** Dar ao admin um ponto de entrada visual para a tela de edição de academia (`/admin/academias/[id]/editar`), que já existe mas é inacessível pela interface.

**Architecture:** Um segundo `<Link>` irmão (estilizado como botão de ícone) é sobreposto no `GymCard`, fora do `<Link>` principal, para não aninhar `<a>` em `<a>`. O `GymCard` recebe `adminEditHref?: string` e permanece agnóstico de auth. O `GymResults` deriva esse href por card quando `isAdmin`, e a página `/academias` (que já conhece o papel via `useAuthStore`) decide o `isAdmin`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, lucide-react (`Pencil`), Vitest + Testing Library, Zustand (`useAuthStore`).

---

## Tarefas

- [x] 1. `GymCard`: prop `adminEditHref` + `<Link>` de edição sobreposto → `task-01.md`
- [x] 2. `GymResults`: prop `isAdmin` + repasse de `adminEditHref` por card → `task-02.md`
- [x] 3. Página `/academias`: passar `isAdmin` para `GymResults` → `task-03.md`

## Ondas de Execução

<!--
  Cadeia dependente: Task 2 usa a prop criada na Task 1; Task 3 usa a prop criada na
  Task 2. Trabalho inerentemente sequencial — a opção de execução paralela não oferece
  ganho de tempo aqui. Uma onda sequencial por task.
-->

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (sequential): 3
