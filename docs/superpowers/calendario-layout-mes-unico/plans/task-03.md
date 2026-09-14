# Task 3: Integração na `page.tsx`: mês único, pill híbrido, aria-live, swipe e estados preservados [FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-layout-mes-unico.md`
**Spec:** `../specs/calendario-layout-mes-unico-design.md`
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

Refatorar `apps/frontend/src/app/(authenticated)/calendario/page.tsx` para usar `useCalendarNavigation`, `MonthlyCalendar` e `HolidayList`, trocando grid de 12 meses por mês único, mantendo `pill` de ano híbrido, `aria-live="polite"`, swipe/`ArrowLeft/Right` e estados `role="status"`/`role="alert"` preservados.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx` (estende)

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: `page.tsx` delega para componentes puros, mantém `useFeriadosQuery(["feriados", year])` sem refetch por mês.
- `wcag-audit-patterns`: `aria-live="polite"` no título do mês, foco permanece em `ref` após `setState`, `prefers-reduced-motion` desabilita transição, `role="status"`/`role="alert"` preservados.
- `typescript-advanced`: remove tipos `CalendarMonth` legados de 12 meses, usa `Feriado` + `monthIndex` tipado `0-11`.
- `shadcn`: mantém `PageContainer width="wide"`, `PageHeader`, `Card`, `Skeleton`, `EmptyState` e `Button` existentes.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-layout-mes-unico-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe fonte de design original para esta tela além do mockup?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente
- **Decisões visuais já tomadas (não refazer):** `PageContainer wide` → `PageHeader` + `pill` ano `rounded-full` mono + `grid xl:grid-cols-[minmax(0,1fr)_320px]` com calendário + sidebar; `MonthlyCalendar` já traz `rounded-[22px]`; `Skeleton h-56 rounded-[22px]` em loading.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Confirmar mockup em `../specs/mockups/calendario-layout-mes-unico-visual.md` e que não há Figma externo; usar `PageContainer`/`PageHeader` reais e `MonthlyCalendar` da Task 02 como baseline — não re-derivar tokens `--color-primary #39e58c` (`--volt-green`), usar `bg-primary/10` sem hardcode.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/app/(authenticated)/calendario/page.test.tsx — adicionar casos ao describe existente
import { http, HttpResponse } from "msw"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import CalendarPage from "./page"
import { BRASIL_API_FERIADOS_URL } from "@/test/msw/handlers"

test("exibe mês atual por padrão e navega com setas de mês com virada de ano", async () => {
  server.use(
    http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([{ date: "2026-09-07", name: "Independência do Brasil", type: "national" }, { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" }])),
    http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () => HttpResponse.json([{ date: "2027-01-01", name: "Confraternização Universal", type: "national" }])),
  )
  const user = userEvent.setup()
  renderWithProviders(<CalendarPage initialYear={2026} />) // initialMonth defaults to now, but test forces via navigation
  // inicialmente setembro (mês 8) visível, outubro não
  expect(await screen.findByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
  expect(within(screen.getByRole("complementary")).getByText(/Independência/)).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }))
  expect(await screen.findByRole("heading", { name: /Outubro 2026/ })).toBeInTheDocument()
  expect(within(screen.getByRole("complementary")).getByText(/Aparecida/)).toBeInTheDocument()
})

test("mantém pill de ano híbrido e aria-live ao trocar mês", async () => {
  server.use(http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([])))
  renderWithProviders(<CalendarPage initialYear={2026} />)
  expect(screen.getByRole("button", { name: /Ir para 2025/ })).toBeInTheDocument()
  expect(screen.getByText(/Setembro 2026/).closest("[aria-live='polite']")).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/\(authenticated\)/calendario/page.test.tsx --run`
Expected: FAIL — ainda renderiza 12 `Card`s ou não há `heading /Setembro 2026/` único / complement `aria-label` não encontrado

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/app/(authenticated)/calendario/page.tsx — refatorar
"use client"
import { useRef } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { useFeriadosQuery } from "@/features/calendario-feriados/api/use-feriados-query"
import { useCalendarNavigation, getMonthLabel } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
import { MonthlyCalendar } from "@/features/calendario-feriados/ui/monthly-calendar"
import { HolidayList } from "@/features/calendario-feriados/ui/holiday-list"
import { getFeriadosDoMes } from "@/features/calendario-feriados/lib/get-feriados-do-mes"

export default function CalendarPage({ initialYear, initialMonth }: { initialYear?: number; initialMonth?: number }) {
  const { selectedYear, selectedMonth, goPrevMonth, goNextMonth, goPrevYear, goNextYear } = useCalendarNavigation(initialYear, initialMonth)
  const query = useFeriadosQuery(selectedYear) // com placeholderData: keepPreviousData no hook para não flickar ao trocar de ano
  const feriadosDoMes = query.data ? getFeriadosDoMes(query.data, selectedMonth) : []
  const prevBtnRef = useRef<HTMLButtonElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const handlePrevMonth = () => { goPrevMonth(); queueMicrotask(() => prevBtnRef.current?.focus()) }
  const handleNextMonth = () => { goNextMonth(); queueMicrotask(() => nextBtnRef.current?.focus()) }
  return (
    <PageContainer as="section" width="wide" className="gap-0">
      <PageHeader title={`Calendário ${selectedYear}`} action={<YearNavigation selectedYear={selectedYear} onPreviousYear={goPrevYear} onNextYear={goNextYear} />} />
      {query.isPending && !query.data ? <CalendarLoadingState /> : query.isError ? <CalendarErrorState query={query} /> :
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <MonthlyCalendar monthIndex={selectedMonth} year={selectedYear} feriados={feriadosDoMes} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} prevBtnRef={prevBtnRef} nextBtnRef={nextBtnRef} />
          <aside role="complementary" aria-label="Feriados do mês"><HolidayList monthIndex={selectedMonth} year={selectedYear} feriados={feriadosDoMes} totalNoAno={query.data?.length ?? 0} /></aside>
          {query.isFetching && <span role="status" className="sr-only">Carregando feriados de {selectedYear}</span>}
        </div>}
    </PageContainer>
  )
}
// manter YearNavigation, CalendarLoadingState, CalendarErrorState existentes; remover buildCalendarMonths de 12 meses
```

Swipe: `const touch = useRef<{x:number; y:number} | null>(null); onTouchStart={e=>touch.current={x:e.touches[0].clientX, y:e.touches[0].clientY}} onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-(touch.current?.x??0); const dy=Math.abs(e.changedTouches[0].clientY-(touch.current?.y??0)); if(dy>30) return; if(Math.abs(dx)>40) dx>0?handlePrevMonth():handleNextMonth() }}` ativo apenas `<768px` via `matchMedia` ou CSS; `useEffect` para `keydown ArrowLeft/Right` com teardown.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/\(authenticated\)/calendario/page.test.tsx --run`
Expected: PASS (novos casos + 7 existentes atualizados para asserir 1 Card)

- **Step 5: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/calendario/page.tsx apps/frontend/src/app/\(authenticated\)/calendario/page.test.tsx
git commit -m "feat(calendario-layout-mes-unico): integra mês único com pill híbrido e aria-live"
```

## Critérios de Sucesso

- [ ] `page.tsx` renderiza 1 `MonthlyCalendar` com mês atual e `aria-live="polite"` no título (FR-001, FR-007)
- [ ] Setas de mês funcionam com virada dez→jan e jan→dez disparando nova `query` quando ano muda (FR-002, FR-003)
- [ ] `pill` de ano híbrido permanece no `PageHeader` (FR-004)
- [ ] Sidebar `HolidayList` filtra por `selectedMonth` e mostra total do ano (FR-005)
- [ ] Swipe e `ArrowLeft/Right` navegam (FR-009)
- [ ] `role="status"` loading e `role="alert"` erro preservados ao trocar ano (FR-010)
- [ ] `queryKey ["feriados", year]` anual mantido, filtro em memória (FR-011)
