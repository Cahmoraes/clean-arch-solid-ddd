# Tarefas: Responsividade Mobile — Usuários (Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/responsividade-mobile-admin-usuarios-design.md`
**PRD:** N/A

**Goal:** Tornar a rota `/admin/usuarios` usável em telas ≤560px: modal com respiro lateral, busca acessível via botão-ícone e um `ThemeToggle` compacto que abre espaço no header, sem lógica de negócio nova.

**Architecture:** Três ajustes puramente visuais/CSS em cinco arquivos existentes. `dialog.tsx` e `alert-dialog.tsx` ganham um `w-[calc(100%-2rem)]` incondicional na base (sem breakpoint), neutro em qualquer tela onde o `max-w-*` do consumidor já limita a largura; `dialog.tsx` também ganha `max-h-[calc(100dvh-2rem)] overflow-y-auto` (contenção vertical — `alert-dialog.tsx` não precisa, confirmações são curtas). `SearchBar` e `ThemeToggle` ganham uma prop `compact?: boolean` que troca o render para uma variante icon-only, reaproveitando o estado/lógica existentes (`onActivate`, `useTheme`/`setTheme`). `authenticated-shell.tsx` passa a montar duas instâncias de cada (completa e compacta), alternadas via o padrão CSS-only já usado no projeto (`max-[560px]:hidden` / `hidden max-[560px]:flex`), sem hook de media query novo.

**Tech Stack:** Next.js (App Router), React (Client Components), Tailwind CSS v4, Radix UI (`@radix-ui/react-dialog`), `lucide-react`, `next-themes`, Vitest + Testing Library (`happy-dom`).

**Nota sobre alcance (Reach):** `dialog.tsx`, `alert-dialog.tsx`, `search-bar.tsx` e `authenticated-shell.tsx` têm importadores fora do write-set das tasks (3 consumidores de `Dialog`, 3 de `AlertDialog`, 2 páginas que usam `SearchBar`, 1 layout que usa `AuthenticatedShell`). Nenhum deles precisa de task própria: as mudanças são aditivas (props `compact?: boolean` opcionais, troca `w-full` → `w-[calc(100%-2rem)]` e adição de `max-h`/`overflow-y-auto` sem alterar a assinatura de `DialogContent`/`AlertDialogContent`) — decisão consciente, não uma lacuna de cobertura.

---

## Tarefas

- [ ] 1. Modais: respiro lateral incondicional e contenção vertical no `DialogContent`/`AlertDialogContent` → `task-01.md`
- [ ] 2. `SearchBar`: variante `compact` (botão-ícone) → `task-02.md`
- [ ] 3. `ThemeToggle`: variante `compact` (botão redondo) → `task-03.md`
- [ ] 4. Header do `authenticated-shell`: duas instâncias de cada componente → `task-04.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3
- **Wave 2** (sequential): 4

## Verificação — Comando Completo

O repositório tem múltiplos runners de teste (frontend, backend, e configs `qa/evidence/**` por feature) — nenhum comando único cobre "a suite inteira". Este plano só toca `apps/frontend/**`; os comandos relevantes para a barreira de integração (fim da Wave 2) são:

- **Por task (escopo único):** já documentado em cada `task-NN.md` via `pnpm --filter frontend exec vitest run <arquivo>`.
- **Suite completa do frontend:** `pnpm --filter frontend test` (script `"test": "vitest run"` em `apps/frontend/package.json`, usa `apps/frontend/vitest.config.ts`, cobre `src/**/*.{test,spec}.{ts,tsx}` — inclui os 4 arquivos de teste desta feature).
- **Teste de aceitação de outra feature afetado (task-04, Step 5.5):** `us-001-navigation-palette-open-close.acceptance.test.tsx` em `docs/superpowers/global-command-palette/qa/evidence/us-001-usurio-autenticado-abrir-um-palette/` — sem script `package.json`/turbo associado e, conforme documentado na task-04, não executável isoladamente neste ambiente (limitação pré-existente do harness de evidence dessa feature, fora do escopo deste plano). Verificação dessa correção específica é feita por revisão estática, não por execução automatizada.
- **Backend (`apps/backend/**`):** fora de escopo — nenhum arquivo de backend é modificado por este plano; os runners de backend (`apps/backend/vite.config.ts` e os 4 configs em `apps/backend/test/`) não precisam rodar.
