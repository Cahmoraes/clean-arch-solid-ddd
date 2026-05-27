# Task 8: Frontend — Tipos UserFilter + componente UserFilterBar [RF-002, RF-003, RF-005, RF-006]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Cria o tipo `UserFilter` e a interface `UserStats`, depois o componente `UserFilterBar` que exibe tabs de categoria com badge numérico — seguindo o padrão visual do `CheckInFilterBar` existente. Inclui testes unitários com Testing Library.

## Arquivos

- Create: `apps/frontend/src/features/admin/types.ts`
- Create: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Create: `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- react: componente controlado (sem estado interno)
- tailwindcss: tokens semânticos — `bg-secondary`, `bg-background`, `text-muted-foreground`, `rounded-full`
- shadcn: usar `Button` de `@/components/ui/button` para consistência
- test-antipatterns: testar comportamento visível (labels, aria, clicks), não implementação
- vitest: `describe` + `test` (nunca `it`), descrições em PT-BR

## Passos

- [ ] **Step 1: Criar o arquivo de tipos**

Crie `apps/frontend/src/features/admin/types.ts`:

```typescript
export type UserFilter = "all" | "member" | "admin" | "active" | "inactive"

export interface UserStats {
  total: number
  members: number
  admins: number
  active: number
  inactive: number
}
```

- [ ] **Step 2: Escrever o teste falhando**

Crie `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { UserStats } from "../types"
import { UserFilterBar } from "./user-filter-bar"

const COUNTS: UserStats = {
  total: 48,
  members: 41,
  admins: 7,
  active: 45,
  inactive: 3,
}

describe("UserFilterBar", () => {
  test("deve renderizar as cinco tabs de filtro", () => {
    render(
      <UserFilterBar
        activeFilter="all"
        counts={COUNTS}
        onFilterChange={vi.fn()}
      />,
    )
    expect(screen.getByRole("button", { name: /todos/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /membros/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /administradores/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ativos/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /inativos/i })).toBeInTheDocument()
  })

  test("deve exibir os contadores em cada tab", () => {
    render(
      <UserFilterBar
        activeFilter="all"
        counts={COUNTS}
        onFilterChange={vi.fn()}
      />,
    )
    expect(screen.getByText("48")).toBeInTheDocument()
    expect(screen.getByText("41")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("45")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  test("deve marcar a tab ativa com aria-pressed=true", () => {
    render(
      <UserFilterBar
        activeFilter="member"
        counts={COUNTS}
        onFilterChange={vi.fn()}
      />,
    )
    expect(
      screen.getByRole("button", { name: /membros/i }),
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByRole("button", { name: /todos/i }),
    ).toHaveAttribute("aria-pressed", "false")
  })

  test("deve chamar onFilterChange com o valor correto ao clicar em uma tab", async () => {
    const onFilterChange = vi.fn()
    render(
      <UserFilterBar
        activeFilter="all"
        counts={COUNTS}
        onFilterChange={onFilterChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /administradores/i }))
    expect(onFilterChange).toHaveBeenCalledWith("admin")
  })

  test("deve chamar onFilterChange com 'all' ao clicar em Todos", async () => {
    const onFilterChange = vi.fn()
    render(
      <UserFilterBar
        activeFilter="member"
        counts={COUNTS}
        onFilterChange={onFilterChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /todos/i }))
    expect(onFilterChange).toHaveBeenCalledWith("all")
  })
})
```

- [ ] **Step 3: Rodar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "UserFilterBar"
```

Esperado: FAIL — `UserFilterBar` não existe.

- [ ] **Step 4: Criar o componente**

Crie `apps/frontend/src/features/admin/components/user-filter-bar.tsx`:

```typescript
import { Button } from "@/components/ui/button"
import type { UserFilter, UserStats } from "../types"

const FILTERS: { label: string; value: UserFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Membros", value: "member" },
  { label: "Administradores", value: "admin" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
]

function countForFilter(filter: UserFilter, counts: UserStats): number {
  switch (filter) {
    case "all":
      return counts.total
    case "member":
      return counts.members
    case "admin":
      return counts.admins
    case "active":
      return counts.active
    case "inactive":
      return counts.inactive
  }
}

export interface UserFilterBarProps {
  activeFilter: UserFilter
  counts: UserStats
  onFilterChange: (filter: UserFilter) => void
}

export function UserFilterBar({
  activeFilter,
  counts,
  onFilterChange,
}: UserFilterBarProps) {
  return (
    <fieldset
      className="flex flex-wrap gap-2 border-0 p-0"
      aria-label="Filtrar usuários por categoria"
    >
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "primary" : "outline"}
          size="sm"
          className="rounded-md gap-1.5"
          onClick={() => onFilterChange(filter.value)}
          aria-pressed={activeFilter === filter.value}
        >
          {filter.label}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {countForFilter(filter.value, counts)}
          </span>
        </Button>
      ))}
    </fieldset>
  )
}
```

- [ ] **Step 5: Rodar o teste para confirmar sucesso**

```bash
pnpm --filter frontend test -- -t "UserFilterBar"
```

Esperado: 5 testes PASS.

- [ ] **Step 6: Rodar lint e verificar tipos**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Esperado: zero erros.

## Critérios de Sucesso

- `UserFilter` e `UserStats` exportados de `features/admin/types.ts`
- `UserFilterBar` renderiza 5 tabs com labels e badges numéricos
- Tab ativa tem `aria-pressed="true"`
- `onFilterChange` é chamada com o valor correto ao clicar
- 5 testes passando
- `lint:fix` e `tsc:check` passam sem erros
