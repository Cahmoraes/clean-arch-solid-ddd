# Task 1: Hook de navegação `useCalendarNavigation` com virada de ano e acessibilidade [FR-002, FR-003, FR-006, FR-009, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-layout-mes-unico.md`
**Spec:** `../specs/calendario-layout-mes-unico-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Criar hook `useCalendarNavigation` que controla `selectedYear`/`selectedMonth`, implementa virada de ano automática (dez→jan, jan→dez), expõe `goPrevMonth/goNextMonth/goPrevYear/goNextYear/goToToday` e mantém compatibilidade com `queryKey ["feriados", year]` anual.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.ts`
- Test: `apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipagem `UseCalendarNavigationReturn` com `selectedYear: number`, `selectedMonth: number` e handlers tipados.
- `vercel-react-best-practices`: hook puro com `useState`/`useCallback` sem re-render desnecessário; estado derivado de `Date`.
- `wcag-audit-patterns`: expõe valores para `aria-label` dinâmico (`getMonthLabel`) e garante foco preservado via refs na integração.

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.test.tsx
import { act, renderHook } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { useCalendarNavigation } from "./use-calendar-navigation"

describe("useCalendarNavigation", () => {
  test("avança de dezembro para janeiro do próximo ano", () => {
    const { result } = renderHook(() => useCalendarNavigation(2026, 11))
    act(() => result.current.goNextMonth())
    expect(result.current.selectedYear).toBe(2027)
    expect(result.current.selectedMonth).toBe(0)
  })
  test("volta de janeiro para dezembro do ano anterior", () => {
    const { result } = renderHook(() => useCalendarNavigation(2026, 0))
    act(() => result.current.goPrevMonth())
    expect(result.current.selectedYear).toBe(2025)
    expect(result.current.selectedMonth).toBe(11)
  })
  test("goToToday restaura mês e ano atuais", () => {
    const { result } = renderHook(() => useCalendarNavigation(2020, 0))
    act(() => result.current.goToToday())
    const now = new Date()
    expect(result.current.selectedYear).toBe(now.getFullYear())
    expect(result.current.selectedMonth).toBe(now.getMonth())
  })
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/hooks/use-calendar-navigation.test.tsx --run`
Expected: FAIL with "Cannot find module './use-calendar-navigation'" ou "useCalendarNavigation is not defined"

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.ts
"use client"
import { useCallback, useState } from "react"

export interface UseCalendarNavigationReturn {
  selectedYear: number
  selectedMonth: number
  goPrevMonth: () => void
  goNextMonth: () => void
  goPrevYear: () => void
  goNextYear: () => void
  goToToday: () => void
}

export function useCalendarNavigation(initialYear?: number, initialMonth?: number): UseCalendarNavigationReturn {
  const now = new Date()
  const [selectedYear, setYear] = useState(initialYear ?? now.getFullYear())
  const [selectedMonth, setMonth] = useState(initialMonth ?? now.getMonth())

  const goPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11 }
      return m - 1
    })
  }, [])
  const goNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0 }
      return m + 1
    })
  }, [])
  const goPrevYear = useCallback(() => setYear((y) => y - 1), [])
  const goNextYear = useCallback(() => setYear((y) => y + 1), [])
  const goToToday = useCallback(() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }, [])

  return { selectedYear, selectedMonth, goPrevMonth, goNextMonth, goPrevYear, goNextYear, goToToday }
}

export function getMonthLabel(monthIndex: number, year: number): string {
  const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
  return `${MONTH_NAMES[monthIndex]} ${year}`
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/hooks/use-calendar-navigation.test.tsx --run`
Expected: PASS (3 tests)

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.ts apps/frontend/src/features/calendario-feriados/hooks/use-calendar-navigation.test.tsx
git commit -m "feat(calendario-layout-mes-unico): adiciona useCalendarNavigation com virada de ano"
```

## Critérios de Sucesso

- [ ] `goNextMonth` de 11 vira `0` e incrementa ano; `goPrevMonth` de `0` vira `11` e decrementa ano (FR-003)
- [ ] `goPrevYear`/`goNextYear` alteram só ano (FR-003, FR-011)
- [ ] `getMonthLabel` retorna `"Setembro 2026"` para uso em `aria-label` (FR-006)
- [ ] `goToToday` restaura para `new Date()` (FR-002)
- [ ] Testes cobrem virada dez→jan e jan→dez e swipe/keyboard será integrado na Task 3 (FR-009 parcial)
