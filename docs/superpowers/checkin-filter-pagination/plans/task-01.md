# Task 1: Hook `useCheckInFilters` — URL state para filtro e página [RF-006, RF-007, RF-010, RF-011, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-checkin-filter-pagination.md`
**Spec:** `../specs/checkin-filter-pagination-design.md`

## Visão Geral

Criar o hook `useCheckInFilters` que gerencia o estado de `status` e `page` via URL search params do Next.js. É a fonte de verdade da feature: lê `useSearchParams()`, escreve com `router.replace()`, reseta `page=1` ao trocar de status e faz parse defensivo de valores inválidos.

## Arquivos

- Create: `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`
- Create: `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.test.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever testes antes da implementação
- test-antipatterns: não mockar URLSearchParams real — usar instâncias reais do constructor

## Passos

- [ ] **Step 1: Criar o arquivo de teste com os casos de comportamento**

```typescript
// apps/frontend/src/features/check-ins/hooks/use-check-in-filters.test.ts
import { act, renderHook } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCheckInFilters } from './use-check-in-filters.js'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

describe('useCheckInFilters', () => {
  const mockReplace = vi.fn()

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>)
    mockReplace.mockReset()
  })

  it('returns undefined status and page 1 when URL has no params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.status).toBeUndefined()
    expect(result.current.page).toBe(1)
  })

  it('parses valid status from URL', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.status).toBe('pending')
  })

  it('parses page from URL', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=3') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.page).toBe(3)
  })

  it('ignores invalid status values and returns undefined', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=invalid') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.status).toBeUndefined()
  })

  it('ignores invalid page values and returns 1', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=abc') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.page).toBe(1)
  })

  it('setStatus updates URL with new status and resets page to 1', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=3') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    act(() => {
      result.current.setStatus('pending')
    })
    expect(mockReplace).toHaveBeenCalledWith('?page=1&status=pending')
  })

  it('setStatus with undefined removes status param and resets page to 1', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending&page=2') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    act(() => {
      result.current.setStatus(undefined)
    })
    expect(mockReplace).toHaveBeenCalledWith('?page=1')
  })

  it('setPage updates page param and preserves status', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending&page=1') as ReturnType<typeof useSearchParams>)
    const { result } = renderHook(() => useCheckInFilters())
    act(() => {
      result.current.setPage(2)
    })
    expect(mockReplace).toHaveBeenCalledWith('?status=pending&page=2')
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- use-check-in-filters
```

Esperado: falha com `Cannot find module './use-check-in-filters.js'`

- [ ] **Step 3: Criar o hook**

```typescript
// apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts
'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export type CheckInFilterStatus = 'pending' | 'validated' | 'rejected' | undefined

const VALID_STATUSES = new Set<string>(['pending', 'validated', 'rejected'])

function parseStatus(value: string | null): CheckInFilterStatus {
  if (!value || !VALID_STATUSES.has(value)) return undefined
  return value as CheckInFilterStatus
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

export interface UseCheckInFiltersReturn {
  status: CheckInFilterStatus
  page: number
  setStatus: (status: CheckInFilterStatus) => void
  setPage: (page: number) => void
}

export function useCheckInFilters(): UseCheckInFiltersReturn {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))

  const setStatus = useCallback(
    (newStatus: CheckInFilterStatus) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newStatus) {
        params.set('status', newStatus)
      } else {
        params.delete('status')
      }
      params.set('page', '1')
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(newPage))
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  return { status, page, setStatus, setPage }
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
cd apps/frontend && pnpm test -- use-check-in-filters
```

Esperado: todos os 7 testes passando

- [ ] **Step 5: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros de tipo

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/check-ins/hooks/
git commit -m "feat(frontend): add useCheckInFilters hook for URL-synced filter state"
```

## Critérios de Sucesso

- Todos os 7 testes passando
- Status inválido na URL retorna `undefined`
- Page inválida na URL retorna `1`
- `setStatus` reseta `page` para `1` via `router.replace`
- `setPage` preserva o `status` atual na URL
- `tsc:check` sem erros [RF-012, RF-013]
