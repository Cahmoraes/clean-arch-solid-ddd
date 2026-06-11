# Tarefas: Design System Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/design-system-migration-design.md`
**PRD:** N/A

> Spec-only planning; no RF traceability available.

**Goal:** Migrar o design system do frontend de paleta monocromática para cromática (indigo/violet/teal), trocando tokens, componentes shadcn/ui, shell de navegação e páginas de autenticação, mantendo o dark/light mode existente.

**Architecture:** A migração é feita em camadas: (1) tokens CSS em `globals.css` e carga de fonte em `layout.tsx`; (2) componentes primitivos em `src/components/ui/`; (3) shell de layout em `src/components/layout/`; (4) páginas públicas; (5) feature de dashboard. Cada tarefa é independente e termina com a validação `tsc:check + lint:fix + test + build`. O dark mode é mantido via seletor `.dark` no mesmo `globals.css`.

**Tech Stack:** Next.js 16, Tailwind CSS v4 (`@theme`), shadcn/ui (Radix + cva), next-themes, Vitest + Testing Library, Biome

---

## Tarefas

- [x] 1. Tokens base — globals.css + Inter Variable em layout.tsx → `task-01.md`
- [x] 2. Button + Input — rounded-md e nova paleta → `task-02.md`
- [x] 3. Card, Dialog, AlertDialog, Skeleton — elevação e radius → `task-03.md`
- [x] 4. Tabs, Pagination, EmptyState — componentes interativos secundários → `task-04.md`
- [x] 5. AuthenticatedShell — sidebar com identidade indigo → `task-05.md`
- [x] 6. PublicShell + páginas de autenticação — hero indigo → `task-06.md`
- [x] 7. Componentes do Dashboard — nova paleta cromática → `task-07.md`
- [x] 8. Substituição do DESIGN.md + validação final → `task-08.md`
