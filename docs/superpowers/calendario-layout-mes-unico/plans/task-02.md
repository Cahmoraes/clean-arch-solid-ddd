# Task 2: Componentes `MonthlyCalendar` e `HolidayList` + filtro e animação [FR-001, FR-005, FR-006, FR-008, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-calendario-layout-mes-unico.md`
**Spec:** `../specs/calendario-layout-mes-unico-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Extrair `MonthlyCalendar` (header com setas + grid 7cols + destaque feriado) e `HolidayList` (sidebar filtrada por mês) como componentes reutilizáveis em `features/calendario-feriados/ui/`, com util `getFeriadosDoMes` e animação CSS `180ms slide+fade` respeitando `prefers-reduced-motion`.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Create: `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx`
- Create: `apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.ts`
- Test: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.test.ts`

### Conformidade com as Skills Padrão

- `shadcn`: usa `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button` com `rounded-[22px]` e `cn`.
- `wcag-audit-patterns`: `aria-label` dinâmico nas setas com `getMonthLabel`, `role="grid"` nos dias, `day.holiday` com `aria-label` e `prefers-reduced-motion`.
- `typescript-advanced`: props tipadas `MonthlyCalendarProps { monthIndex: number; year: number; feriados: Feriado[]; onPrevMonth/onNextMonth; prevBtnRef?: RefObject<HTMLButtonElement|null>; nextBtnRef?: RefObject<HTMLButtonElement|null> }` e `HolidayListProps`.
- `vercel-react-best-practices`: componente puro, sem fetch interno, recebe `Feriado[]` filtrado; anima apenas via CSS.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-layout-mes-unico-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** `Card rounded-[22px]`, `weekdays 11px uppercase`, `days grid-cols-7 gap-1` com `day min-h-10` e feriado `bg-primary/10 border-primary` (`--color-primary #39e58c`) + `data-name 7px`, `HolidayList` com `FeriadoItem bg-muted p-3` e `f-date rounded-[10px] mono`, `aria-live="polite"` único no `CardTitle h2`, sem hardcode `bg-[#ecfdf5]`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Read the design source and fidelity tools already recorded in `### Fidelidade Visual` acima. Confirmar com usuário se existe URL de Figma/screenshot além do mockup curado; se não houver, construir manualmente a partir de `../specs/mockups/calendario-layout-mes-unico-visual.md` reutilizando tokens e estrutura. Nenhuma ferramenta de design-to-code configurada — implementação manual.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { MonthlyCalendar } from "./monthly-calendar"

describe("MonthlyCalendar", () => {
  test("renderiza apenas o mês solicitado com feriado destacado", () => {
    render(<MonthlyCalendar monthIndex={8} year={2026} feriados={[{ date: "2026-09-07", name: "Independência do Brasil", type: "national", isNational: true }]} onPrevMonth={() => {}} onNextMonth={() => {}} />)
    expect(screen.getByRole("heading", { name: /Setembro 2026/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/7 de setembro.*Independência/)).toBeInTheDocument()
    expect(screen.queryByText("Outubro")).not.toBeInTheDocument()
  })
  test("setas têm aria-label com mês/ano alvo", () => {
    render(<MonthlyCalendar monthIndex={8} year={2026} feriados={[]} onPrevMonth={() => {}} onNextMonth={() => {}} />)
    expect(screen.getByRole("button", { name: /Mês anterior, agosto 2026/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Próximo mês, outubro 2026/ })).toBeInTheDocument()
  })
})
```

```ts
// apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.test.ts
import { describe, expect, test } from "vitest"
import { getFeriadosDoMes } from "./get-feriados-do-mes"
describe("getFeriadosDoMes", () => {
  test("filtra por mês", () => {
    const f = [{ date: "2026-09-07", name: "Independência", type: "national" as const, isNational: true }, { date: "2026-10-12", name: "Aparecida", type: "national" as const, isNational: true }]
    expect(getFeriadosDoMes(f, 8)).toHaveLength(1)
    expect(getFeriadosDoMes(f, 9)[0].name).toBe("Aparecida")
  })
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx src/features/calendario-feriados/lib/get-feriados-do-mes.test.ts --run`
Expected: FAIL with "Cannot find module './monthly-calendar'" / "getFeriadosDoMes is not defined"

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.ts
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
export function getFeriadosDoMes(feriados: ReadonlyArray<Feriado>, monthIndex: number): Feriado[] {
  return feriados.filter((f) => Number(f.date.slice(5, 7)) - 1 === monthIndex)
}
```

```tsx
// apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx
"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import { getMonthLabel } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
const WEEKDAY_LABELS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
interface Props { monthIndex: number; year: number; feriados: Feriado[]; onPrevMonth: () => void; onNextMonth: () => void; prevBtnRef?: React.RefObject<HTMLButtonElement | null>; nextBtnRef?: React.RefObject<HTMLButtonElement | null> }
export function MonthlyCalendar({ monthIndex, year, feriados, onPrevMonth, onNextMonth, prevBtnRef, nextBtnRef }: Props) {
  const prevLabel = monthIndex === 0 ? `Mês anterior, dezembro ${year - 1}` : `Mês anterior, ${getMonthLabel(monthIndex - 1, year)}`
  const nextLabel = monthIndex === 11 ? `Próximo mês, janeiro ${year + 1}` : `Próximo mês, ${getMonthLabel(monthIndex + 1, year)}`
  // build days: 1..daysInMonth + feriado lookup + muted days — filtrado via getFeriadosDoMes já no caller
  return (
    <Card className="rounded-[22px] transition-[transform,opacity] duration-[180ms] motion-reduce:transition-none">
      <CardHeader className="flex-row items-center justify-between">
        <div><CardTitle as="h2" aria-live="polite">{getMonthLabel(monthIndex, year)}</CardTitle><CardDescription>{feriados.length} feriado(s) no mês</CardDescription></div>
        <div className="flex items-center gap-2">
          <Button ref={prevBtnRef} variant="outline" size="icon" aria-label={prevLabel} onClick={onPrevMonth}>‹</Button>
          <Button ref={nextBtnRef} variant="outline" size="icon" aria-label={nextLabel} onClick={onNextMonth}>›</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground" aria-hidden="true">{WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}</div>
        <div role="grid" className="mt-2 grid grid-cols-7 gap-1">{/* CalendarDayCell com role="gridcell" e feriado bg-primary/10 border-primary data-name */}</div>
      </CardContent>
    </Card>
  )
}
// apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx — Card com Feriados de {mês} + bg-muted p-3 list
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx src/features/calendario-feriados/lib/get-feriados-do-mes.test.ts --run`
Expected: PASS (3 tests)

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.ts apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx apps/frontend/src/features/calendario-feriados/lib/get-feriados-do-mes.test.ts
git commit -m "feat(calendario-layout-mes-unico): extrai MonthlyCalendar e HolidayList com filtro por mês"
```

## Critérios de Sucesso

- [ ] `MonthlyCalendar` renderiza só 1 mês com `Card rounded-[22px]` e `role="grid"` (FR-001)
- [ ] `getFeriadosDoMes` filtra por `monthIndex` (FR-005, FR-011)
- [ ] Setas têm `aria-label` com mês/ano alvo (FR-006)
- [ ] Animação `180ms` com `motion-reduce:transition-none` (FR-008)
- [ ] `HolidayList` exibe `{n} de {total}` e mensagem vazia quando `feriadosDoMes` vazio (FR-005)
