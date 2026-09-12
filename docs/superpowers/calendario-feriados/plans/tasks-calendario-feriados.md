# Tarefas: Calendário de Feriados Nacionais

**Spec:** `../specs/calendario-feriados-design.md`
**PRD:** `../prd/prd-calendario-feriados.md`

**Goal:** Nova rota autenticada `/calendario` no frontend com grade mensal, feriados nacionais do Brasil destacados (calculados localmente via `date-holidays`), navegação entre meses/anos e popover com o nome do feriado.

**Architecture:** Feature 100% frontend, sem backend nem chamada de rede. `useFeriadosDoAno(ano)` calcula os feriados via `date-holidays` (memoizado por ano); `feriadosParaModifiers` converte a lista em `modifiers` do `react-day-picker`; `DiaComFeriado` (via prop `components.DayButton` do shadcn `Calendar`, reproduzindo o gerenciamento de foco do `DayButton` nativo que substitui) exibe um `Popover` com o nome do feriado no hover, clique ou foco de teclado; `CalendarioFeriados` orquestra estado local de mês/ano e injeta os dois anteriores no `Calendar` do shadcn/ui.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript · Vitest 4.1.5 + Testing Library 16.3.2 + `@testing-library/user-event` 14.6.1, ambiente `happy-dom` · runner por arquivo: `cd apps/frontend && pnpm exec vitest run <arquivo>` (confirmado: `pnpm --filter frontend test -- --run <arquivo>` NÃO escopa — coleta os 157 arquivos do workspace; a forma direta acima coleta exatamente 1).

**Verificação na barreira de integração (wave/feature completa):** o repositório tem 9 configs de teste distintas (`validate-tasks.cjs --repo-root .` confirma); esta feature só toca `apps/frontend`, então a suíte completa relevante é `cd apps/frontend && pnpm test -- --run` (config `apps/frontend/vitest.config.ts`, `include: src/**/*.{test,spec}.{ts,tsx}`) — nenhuma config de backend/QA é afetada. Rodar também `pnpm --filter frontend tsc:check`, `pnpm --filter frontend lint:fix` e `pnpm --filter frontend build` (gate padrão do projeto, `AGENTS.md` raiz).

**Nota sobre o alerta de "registro" do validador:** `validate-tasks.cjs` aponta `calendar.tsx`/`popover.tsx` como "novos membros sem arquivo de enrollment" — verificado manualmente: `apps/frontend/src/components/ui/` **não tem** barrel/`index.ts` (`grep` por `from "@/components/ui"` sem caminho de arquivo específico não retornou nenhum resultado no projeto); cada componente shadcn é importado pelo caminho direto (`@/components/ui/button`, `@/components/ui/tooltip`, etc.), então não há registro a atualizar. Alerta é falso positivo desta feature, confirmado por leitura do código — não uma lacuna a corrigir.

---

## Tarefas

- [ ] 1. Obter feriados nacionais do ano via `date-holidays` [FR-003] → `task-01.md`
- [ ] 2. Converter feriados em modifiers da grade [FR-002] → `task-02.md`
- [ ] 3. Componentes shadcn Calendar/Popover + popover de feriado [FR-002, FR-006, FR-008] → `task-03.md`
- [ ] 4. Página `/calendario` com orquestração de mês/ano [FR-001, FR-004, FR-005, FR-007, FR-008] → `task-04.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (parallel): 2, 3
- **Wave 3** (sequential): 4
