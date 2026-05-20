# Task 2: Componente `CheckInFilterBar` — pills de filtro por status [RF-001, RF-002, RF-003]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-filter-pagination.md`
**Spec:** `../specs/checkin-filter-pagination-design.md`

## Visão Geral

Criar o componente stateless `CheckInFilterBar` que renderiza 4 pills (Todos, Pendentes, Aprovados, Rejeitados) usando `Button` do shadcn/ui. O pill ativo usa `variant="default"` com `className="rounded-full"`, os inativos usam `variant="outline"`. É completamente controlado pelo hook `useCheckInFilters` via props.

## Arquivos

- Create: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- test-driven-development: testes antes da implementação
- react: componente stateless, sem efeitos colaterais, testável isoladamente

## Passos

- [ ] **Step 1: Criar o arquivo de teste**

```tsx
// apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CheckInFilterStatus } from '../hooks/use-check-in-filters.js'
import { CheckInFilterBar } from './check-in-filter-bar.js'

describe('CheckInFilterBar', () => {
  it('renders all 4 filter pills', () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitados' })).toBeInTheDocument()
  })

  it('marks "Todos" as active (aria-pressed=true) when status is undefined', () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks the matching status pill as active', () => {
    render(<CheckInFilterBar status="pending" onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Aprovados' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onStatusChange with "pending" when Pendentes is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Pendentes' }))
    expect(onStatusChange).toHaveBeenCalledWith('pending')
  })

  it('calls onStatusChange with undefined when Todos is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status="pending" onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onStatusChange).toHaveBeenCalledWith(undefined)
  })

  it('calls onStatusChange with "validated" when Aprovados is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Aprovados' }))
    expect(onStatusChange).toHaveBeenCalledWith('validated')
  })

  it('calls onStatusChange with "rejected" when Rejeitados is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Rejeitados' }))
    expect(onStatusChange).toHaveBeenCalledWith('rejected')
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar
```

Esperado: falha com `Cannot find module './check-in-filter-bar.js'`

- [ ] **Step 3: Criar o componente**

```tsx
// apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx
import { Button } from '@/components/ui/button'
import type { CheckInFilterStatus } from '../hooks/use-check-in-filters.js'

const FILTERS: { label: string; value: CheckInFilterStatus }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Aprovados', value: 'validated' },
  { label: 'Rejeitados', value: 'rejected' },
]

export interface CheckInFilterBarProps {
  status: CheckInFilterStatus
  onStatusChange: (status: CheckInFilterStatus) => void
}

export function CheckInFilterBar({ status, onStatusChange }: CheckInFilterBarProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filtrar check-ins por status"
    >
      {FILTERS.map((filter) => (
        <Button
          key={filter.label}
          variant={status === filter.value ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => onStatusChange(filter.value)}
          aria-pressed={status === filter.value}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/frontend && pnpm test -- check-in-filter-bar
```

Esperado: todos os 7 testes passando

- [ ] **Step 5: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros de tipo

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx \
        apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx
git commit -m "feat(frontend): add CheckInFilterBar pill component"
```

## Critérios de Sucesso

- Todos os 7 testes passando
- O pill ativo recebe `variant="default"` e `aria-pressed="true"` [RF-003]
- Os pills inativos recebem `variant="outline"` e `aria-pressed="false"` [RF-002]
- Todos os 4 pills são renderizados [RF-001]
- `onStatusChange` é chamado com o valor correto ao clicar em cada pill
- `tsc:check` sem erros
