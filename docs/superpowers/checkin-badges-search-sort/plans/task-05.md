# Task 5: Frontend — Atualizar CheckInFilterBar com badges de contagem [RF-001, RF-002, RF-003, RF-004]

**Status:** DONE
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** task-03

> **Decisão visual (brainstorming 2026-06-01):** badge flutuante acima-direita de cada pill
> (opção B), não o count inline do `SegmentedControl`. Implementar via prop
> `countFloat?: boolean` no `SegmentedControl`: quando `true`, o badge é renderizado como
> `position: absolute; top: -8px; right: -4px` com fundo `bg-primary` (verde #39e58c) e
> `text-primary-foreground`, em vez do span inline atual. O botão recebe
> `position: relative` para servir de âncora.

## Visão Geral

Atualiza o `SegmentedControl` para suportar badges flutuantes e o `CheckInFilterBar` para
passá-los a partir de `stats?: CheckInStats`.

## Arquivos

- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`

## Passos

### Passo 1: Estender `SegmentedControl` com `countFloat`

Adicionar prop `countFloat?: boolean` à interface `SegmentedControlProps`. Quando `true`:
- O `<button>` recebe `position: relative` (`relative` no Tailwind).
- O badge de contagem é renderizado como elemento absolutamente posicionado:
  ```tsx
  {typeof item.count === "number" && countFloat && (
    <span
      className="absolute -top-2 -right-1 min-w-[18px] rounded-full bg-primary
                 px-1 py-0 text-center font-mono text-[10px] font-bold
                 leading-[18px] text-primary-foreground border border-background"
    >
      {item.count}
    </span>
  )}
  ```
- Quando `countFloat` é `false` (default), o comportamento original (badge inline) é mantido.

Atualizar o teste existente de `SegmentedControl` para cobrir `countFloat={true}`:
verificar que o badge aparece com a classe `absolute` e que o botão tem `relative`.

### Passo 2: Escrever o teste de `CheckInFilterBar` que falha

Criar `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { CheckInStats } from "../api/extended-paths.js"
import { CheckInFilterBar } from "./check-in-filter-bar"

describe("CheckInFilterBar", () => {
  test("renderiza os pills de filtro sem badges quando stats não é fornecido", () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(screen.getByRole("group")).toBeInTheDocument()
    expect(screen.getByText("Todos")).toBeInTheDocument()
    expect(screen.queryByText("42")).not.toBeInTheDocument()
  })

  test("exibe badges flutuantes de contagem quando stats é fornecido", () => {
    const stats: CheckInStats = { total: 42, pending: 10, validated: 20, rejected: 12 }
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} stats={stats} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  test("chama onStatusChange com undefined ao clicar em Todos", async () => {
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status="pending" onStatusChange={onStatusChange} />)
    await userEvent.click(screen.getByText("Todos"))
    expect(onStatusChange).toHaveBeenCalledWith(undefined)
  })

  test("chama onStatusChange com pending ao clicar em Pendentes", async () => {
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await userEvent.click(screen.getByText("Pendentes"))
    expect(onStatusChange).toHaveBeenCalledWith("pending")
  })
})
```

- [ ] **Step 2a: Rodar o teste para verificar que falha**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar.test 2>&1 | tail -15
```

### Passo 3: Atualizar `CheckInFilterBar`

```typescript
import {
  SegmentedControl,
  type SegmentedItem,
} from "@/components/ui/segmented-control"
import type { CheckInStats } from "../api/extended-paths.js"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

type FilterValue = "todos" | "pending" | "validated" | "rejected"

function buildItems(stats?: CheckInStats): ReadonlyArray<SegmentedItem<FilterValue>> {
  return [
    { value: "todos", label: "Todos", count: stats?.total },
    { value: "pending", label: "Pendentes", count: stats?.pending },
    { value: "validated", label: "Aprovados", count: stats?.validated },
    { value: "rejected", label: "Rejeitados", count: stats?.rejected },
  ]
}

function toFilterValue(status: CheckInFilterStatus): FilterValue {
  return status ?? "todos"
}

function toStatus(value: FilterValue): CheckInFilterStatus {
  return value === "todos" ? undefined : value
}

export interface CheckInFilterBarProps {
  status: CheckInFilterStatus
  onStatusChange: (status: CheckInFilterStatus) => void
  stats?: CheckInStats
}

export function CheckInFilterBar({ status, onStatusChange, stats }: CheckInFilterBarProps) {
  return (
    <SegmentedControl
      aria-label="Filtrar check-ins por status"
      items={buildItems(stats)}
      value={toFilterValue(status)}
      onValueChange={(value) => onStatusChange(toStatus(value))}
      countFloat
      className="w-full [&>button]:flex-1 [&>button]:justify-center"
    />
  )
}
```

- [ ] **Step 3a: Rodar o teste para verificar que passa**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar.test 2>&1 | tail -20
```

### Passo 4: Type check, lint e commit

- [ ] **Step 4a:** `cd apps/frontend && pnpm tsc:check 2>&1 | tail -10`
- [ ] **Step 4b:** `cd apps/frontend && pnpm lint:fix 2>&1 | tail -10`
- [ ] **Step 4c:**

```bash
git add \
  apps/frontend/src/components/ui/segmented-control.tsx \
  apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx \
  apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx
git commit -m "feat(check-ins): add floating count badges to CheckInFilterBar"
```

## Critérios de Sucesso

- `SegmentedControl` com `countFloat` renderiza badge absolutamente posicionado acima-direita do pill
- `<CheckInFilterBar stats={stats} />` exibe badges flutuantes verdes
- `<CheckInFilterBar />` sem `stats` renderiza pills sem badge (sem erro)
- `pnpm test` e `pnpm tsc:check` passam
- RF-001 (badges visíveis): ✅
- RF-002 (badge total no pill "Todos"): ✅
- RF-003 (badges por status nos pills): ✅
- RF-004 (gracioso sem stats — sem crash): ✅
