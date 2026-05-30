# Task 5: Frontend — Atualizar CheckInFilterBar com badges de contagem [RF-001, RF-002, RF-003, RF-004]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** task-03

## Visão Geral

Atualiza o componente `CheckInFilterBar` para exibir badges de contagem em cada pill de filtro. O `SegmentedControl` já suporta a prop `count?: number` em `SegmentedItem` — basta passar os valores corretos. O componente recebe uma prop opcional `stats?: CheckInStats`. Quando `stats` não é fornecido (loading ou erro), os pills são renderizados sem badge.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- code-style: prop opcional com fallback gracioso (sem badge quando stats undefined)

## Passos

### Passo 1: Escrever o teste que falha

Criar `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { CheckInStats } from "../api/extended-paths.js"
import { CheckInFilterBar } from "./check-in-filter-bar"

describe("CheckInFilterBar", () => {
  it("renderiza os pills de filtro sem badges quando stats não é fornecido", () => {
    render(
      <CheckInFilterBar
        status={undefined}
        onStatusChange={vi.fn()}
      />,
    )
    expect(screen.getByRole("group")).toBeInTheDocument()
    expect(screen.getByText("Todos")).toBeInTheDocument()
    expect(screen.getByText("Pendentes")).toBeInTheDocument()
    expect(screen.getByText("Aprovados")).toBeInTheDocument()
    expect(screen.getByText("Rejeitados")).toBeInTheDocument()
    // Sem badges — nenhum número visível
    expect(screen.queryByText("42")).not.toBeInTheDocument()
  })

  it("exibe badges de contagem quando stats é fornecido", () => {
    const stats: CheckInStats = { total: 42, pending: 10, validated: 20, rejected: 12 }
    render(
      <CheckInFilterBar
        status={undefined}
        onStatusChange={vi.fn()}
        stats={stats}
      />,
    )
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  it("chama onStatusChange com undefined ao clicar em Todos", async () => {
    const onStatusChange = vi.fn()
    render(
      <CheckInFilterBar
        status="pending"
        onStatusChange={onStatusChange}
      />,
    )
    await userEvent.click(screen.getByText("Todos"))
    expect(onStatusChange).toHaveBeenCalledWith(undefined)
  })

  it("chama onStatusChange com pending ao clicar em Pendentes", async () => {
    const onStatusChange = vi.fn()
    render(
      <CheckInFilterBar
        status={undefined}
        onStatusChange={onStatusChange}
      />,
    )
    await userEvent.click(screen.getByText("Pendentes"))
    expect(onStatusChange).toHaveBeenCalledWith("pending")
  })
})
```

- [ ] **Step 1: Rodar o teste para verificar que falha**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar.test 2>&1 | tail -15
```

Resultado esperado: `FAIL` com `Property 'stats' does not exist` ou `stats` não encontrado em `CheckInFilterBarProps`.

### Passo 2: Atualizar `CheckInFilterBar` com a prop `stats`

**`apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`** — conteúdo completo atualizado:

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

export function CheckInFilterBar({
  status,
  onStatusChange,
  stats,
}: CheckInFilterBarProps) {
  return (
    <SegmentedControl
      aria-label="Filtrar check-ins por status"
      items={buildItems(stats)}
      value={toFilterValue(status)}
      onValueChange={(value) => onStatusChange(toStatus(value))}
      className="w-full [&>button]:flex-1 [&>button]:justify-center"
    />
  )
}
```

- [ ] **Step 2: Rodar o teste para verificar que passa**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar.test 2>&1 | tail -20
```

Resultado esperado: todos os testes passam.

### Passo 3: Type check e lint

- [ ] **Step 3a: Type check**

```bash
cd apps/frontend && pnpm tsc:check 2>&1 | tail -10
```

Resultado esperado: zero erros.

- [ ] **Step 3b: Lint**

```bash
cd apps/frontend && pnpm lint:fix 2>&1 | tail -10
```

Resultado esperado: zero issues.

- [ ] **Step 3c: Commit**

```bash
git add \
  apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx \
  apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx
git commit -m "feat(check-ins): add stats badges to CheckInFilterBar"
```

## Critérios de Sucesso

- `<CheckInFilterBar stats={stats} .../>` exibe números nos badges dos pills
- `<CheckInFilterBar .../>` sem `stats` renderiza pills sem badge (sem erro)
- `SegmentedItem.count` é `undefined` quando `stats` não é fornecido (sem renderização de badge)
- `pnpm test` e `pnpm tsc:check` passam
- RF-001 (badges visíveis): ✅
- RF-002 (badge total no pill "Todos"): ✅
- RF-003 (badges por status nos pills): ✅
- RF-004 (gracioso sem stats — sem crash): ✅
