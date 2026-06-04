# Task 11: Frontend — useAnalyticsPeriod hook + PeriodSelector component [FR-002, FR-003]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** N/A

## Visão Geral

Cria o hook `useAnalyticsPeriod` que lê e persiste o período selecionado como query param `?period=` na URL (para links compartilháveis), e o componente `PeriodSelector` que renderiza um `SegmentedControl` com as 4 opções de período.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/hooks/use-analytics-period.ts`
- Create: `apps/frontend/src/features/admin/analytics/components/period-selector.tsx`
- Create: `apps/frontend/src/features/admin/analytics/hooks/use-analytics-period.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar `useRouter` + `useSearchParams` do Next.js para persistir período na URL. Não usar Zustand ou useState para isso — a URL é a fonte de verdade (FR-003).

## Passos

- **Step 1: Escrever o teste para useAnalyticsPeriod**

```typescript
// apps/frontend/src/features/admin/analytics/hooks/use-analytics-period.test.ts
import { renderHook, act } from "@testing-library/react"
import { describe, expect, test, vi, beforeEach } from "vitest"

const mockReplace = vi.fn()
const mockGet = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet }),
  usePathname: () => "/admin/analytics",
}))

import { useAnalyticsPeriod } from "./use-analytics-period"

describe("useAnalyticsPeriod", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  test("deve retornar '30d' como período padrão quando não há query param", () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() => useAnalyticsPeriod())
    expect(result.current.period).toBe("30d")
  })

  test("deve retornar o período da URL quando query param está presente", () => {
    mockGet.mockReturnValue("7d")
    const { result } = renderHook(() => useAnalyticsPeriod())
    expect(result.current.period).toBe("7d")
  })

  test("deve atualizar a URL ao chamar setPeriod", () => {
    const { result } = renderHook(() => useAnalyticsPeriod())
    act(() => {
      result.current.setPeriod("12m")
    })
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("period=12m"),
    )
  })

  test("deve retornar '30d' para query param inválido", () => {
    mockGet.mockReturnValue("invalid")
    const { result } = renderHook(() => useAnalyticsPeriod())
    expect(result.current.period).toBe("30d")
  })
})
```

- **Step 2: Rodar o teste — deve falhar**

```bash
pnpm --filter frontend test -- -t "useAnalyticsPeriod"
```

Expected: FAIL — `Cannot find module './use-analytics-period'`

- **Step 3: Implementar useAnalyticsPeriod**

```typescript
// apps/frontend/src/features/admin/analytics/hooks/use-analytics-period.ts
"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export type PeriodKey = "7d" | "30d" | "3m" | "12m"

const VALID_PERIODS: PeriodKey[] = ["7d", "30d", "3m", "12m"]
const DEFAULT_PERIOD: PeriodKey = "30d"

function isValidPeriod(value: string | null): value is PeriodKey {
  return VALID_PERIODS.includes(value as PeriodKey)
}

export interface UseAnalyticsPeriodReturn {
  period: PeriodKey
  setPeriod: (period: PeriodKey) => void
}

export function useAnalyticsPeriod(): UseAnalyticsPeriodReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const rawPeriod = searchParams.get("period")
  const period: PeriodKey = isValidPeriod(rawPeriod) ? rawPeriod : DEFAULT_PERIOD

  const setPeriod = useCallback(
    (newPeriod: PeriodKey) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("period", newPeriod)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return { period, setPeriod }
}
```

- **Step 4: Rodar o teste — deve passar**

```bash
pnpm --filter frontend test -- -t "useAnalyticsPeriod"
```

Expected: PASS — 4 tests passed

- **Step 5: Implementar PeriodSelector**

```typescript
// apps/frontend/src/features/admin/analytics/components/period-selector.tsx
"use client"

import { SegmentedControl } from "@/components/ui/segmented-control"
import type { PeriodKey } from "../hooks/use-analytics-period"

const PERIOD_ITEMS = [
  { value: "7d" as PeriodKey, label: "7 dias" },
  { value: "30d" as PeriodKey, label: "30 dias" },
  { value: "3m" as PeriodKey, label: "3 meses" },
  { value: "12m" as PeriodKey, label: "12 meses" },
] as const

interface PeriodSelectorProps {
  value: PeriodKey
  onValueChange: (value: PeriodKey) => void
  className?: string
}

export function PeriodSelector({ value, onValueChange, className }: PeriodSelectorProps) {
  return (
    <SegmentedControl<PeriodKey>
      items={PERIOD_ITEMS}
      value={value}
      onValueChange={onValueChange}
      aria-label="Selecionar período"
      className={className}
    />
  )
}
```

- **Step 6: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- `useAnalyticsPeriod()` retorna `"30d"` quando não há query param
- `setPeriod("7d")` atualiza a URL com `?period=7d`
- Query param inválido resulta em `"30d"` como fallback
- `PeriodSelector` renderiza 4 opções usando `SegmentedControl`
- `pnpm --filter frontend tsc:check` passa
