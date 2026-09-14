# Tarefas: Calendário Layout Mês Único

**Spec:** `../specs/calendario-layout-mes-unico-design.md`
**PRD:** `../prd/prd-calendario-layout-mes-unico.md`

**Goal:** Substituir grid anual de 12 meses por mês único com navegação híbrida (setas mês + pill ano), sidebar filtrada por mês e animação 180ms, extraindo MonthlyCalendar reutilizável.

**Architecture:** Hook `useCalendarNavigation` controla `selectedMonth/Year` com virada de ano automática e foco; `MonthlyCalendar` renderiza grid 7cols + destaque feriado; `HolidayList` filtra `feriadosDoMes` em memória mantendo `queryKey ["feriados", year]` anual; `page.tsx` orquestra integração, `aria-live` e swipe.

**Tech Stack:** node · Next.js 15 App Router (Route Group `(authenticated)`) · vitest run (happy-dom, `pnpm --filter frontend exec vitest run <file>`) · TanStack Query · shadcn Card/PageContainer/PageHeader

---

## Tarefas

- [ ] 1. Hook de navegação `useCalendarNavigation` com virada de ano e acessibilidade [FR-002, FR-003, FR-006, FR-009, FR-011] → `task-01.md`
- [ ] 2. Componentes `MonthlyCalendar` e `HolidayList` + filtro e animação [FR-001, FR-005, FR-006, FR-008, FR-011] → `task-02.md`
- [ ] 3. Integração na `page.tsx`: mês único, pill híbrido, aria-live, swipe e estados preservados [FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010, FR-011] → `task-03.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (sequential): 3
