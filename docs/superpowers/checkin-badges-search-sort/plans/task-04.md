# Task 4: Frontend — Estender useCheckInFilters com gymName e sortOrder [RF-006, RF-011, RF-012, RF-015, RF-017]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** N/A

## Visão Geral

Estende o hook `useCheckInFilters` para gerenciar dois novos parâmetros de URL:
- `gymName` — valor para busca por academia (string, persistido na URL para suporte a RF-017)
- `sortOrder` — `"asc" | "desc"` com default `"desc"` (persistido na URL)

O hook expõe `setGymName(name: string)` (escrita imediata na URL) e `setSortOrder(order)` (escrita imediata na URL). O debounce é responsabilidade das páginas que usam o hook — elas mantêm estado local de input, aplicam `useDebounce` e chamam `setGymName` com o valor debounced (mesmo padrão da página de usuários).

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`
- Create: `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.test.ts`

### Conformidade com as Skills Padrão

- code-style: URL state management via `useSearchParams` + `router.replace`, sem estado local no hook
- no-workarounds: parse e serialização de parâmetros explícitos, sem stringify genérico

## Passos

### Passo 1: Escrever o teste que falha

Criar `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock next/navigation para controlar searchParams e router
const mockReplace = vi.fn()
let mockSearchParamsString = ""

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  useRouter: () => ({ replace: mockReplace }),
}))

import { useCheckInFilters } from "./use-check-in-filters"

describe("useCheckInFilters", () => {
  beforeEach(() => {
    mockSearchParamsString = ""
    mockReplace.mockClear()
  })

  it("retorna gymName vazio por padrão", () => {
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.gymName).toBe("")
  })

  it("retorna sortOrder desc por padrão", () => {
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.sortOrder).toBe("desc")
  })

  it("lê gymName da URL", () => {
    mockSearchParamsString = "gymName=smartfit"
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.gymName).toBe("smartfit")
  })

  it("lê sortOrder da URL", () => {
    mockSearchParamsString = "sortOrder=asc"
    const { result } = renderHook(() => useCheckInFilters())
    expect(result.current.sortOrder).toBe("asc")
  })

  it("setGymName atualiza a URL com gymName e reseta page para 1", () => {
    mockSearchParamsString = "page=3&status=pending"
    const { result } = renderHook(() => useCheckInFilters())

    act(() => {
      result.current.setGymName("smartfit")
    })

    const calledWith = mockReplace.mock.calls[0][0] as string
    const params = new URLSearchParams(calledWith.replace("?", ""))
    expect(params.get("gymName")).toBe("smartfit")
    expect(params.get("page")).toBe("1")
    expect(params.get("status")).toBe("pending") // preserva outros params
  })

  it("setGymName remove gymName da URL quando string vazia", () => {
    mockSearchParamsString = "gymName=smartfit"
    const { result } = renderHook(() => useCheckInFilters())

    act(() => {
      result.current.setGymName("")
    })

    const calledWith = mockReplace.mock.calls[0][0] as string
    const params = new URLSearchParams(calledWith.replace("?", ""))
    expect(params.has("gymName")).toBe(false)
  })

  it("setSortOrder atualiza a URL com sortOrder e reseta page para 1", () => {
    mockSearchParamsString = "page=2"
    const { result } = renderHook(() => useCheckInFilters())

    act(() => {
      result.current.setSortOrder("asc")
    })

    const calledWith = mockReplace.mock.calls[0][0] as string
    const params = new URLSearchParams(calledWith.replace("?", ""))
    expect(params.get("sortOrder")).toBe("asc")
    expect(params.get("page")).toBe("1")
  })
})
```

- [ ] **Step 1: Rodar o teste para verificar que falha**

```bash
cd apps/frontend && pnpm test -- use-check-in-filters.test 2>&1 | tail -15
```

Resultado esperado: `FAIL` com `result.current.gymName is not a function` ou `gymName` não existe em `UseCheckInFiltersReturn`.

### Passo 2: Atualizar `useCheckInFilters` com novos campos e setters

**`apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`** — conteúdo completo atualizado:

```typescript
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export type CheckInFilterStatus =
  | "pending"
  | "validated"
  | "rejected"
  | undefined

export type SortOrder = "asc" | "desc"

const VALID_STATUSES = new Set<string>(["pending", "validated", "rejected"])
const VALID_SORT_ORDERS = new Set<string>(["asc", "desc"])

function parseStatus(value: string | null): CheckInFilterStatus {
  if (!value || !VALID_STATUSES.has(value)) return undefined
  return value as CheckInFilterStatus
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

function parseSortOrder(value: string | null): SortOrder {
  if (!value || !VALID_SORT_ORDERS.has(value)) return "desc"
  return value as SortOrder
}

export interface UseCheckInFiltersReturn {
  status: CheckInFilterStatus
  page: number
  gymName: string
  sortOrder: SortOrder
  setStatus: (status: CheckInFilterStatus) => void
  setPage: (page: number) => void
  setGymName: (name: string) => void
  setSortOrder: (order: SortOrder) => void
}

export function useCheckInFilters(): UseCheckInFiltersReturn {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = parseStatus(searchParams.get("status"))
  const page = parsePage(searchParams.get("page"))
  const gymName = searchParams.get("gymName") ?? ""
  const sortOrder = parseSortOrder(searchParams.get("sortOrder"))

  const setStatus = useCallback(
    (newStatus: CheckInFilterStatus) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newStatus) {
        params.set("status", newStatus)
      } else {
        params.delete("status")
      }
      params.set("page", "1")
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(newPage))
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  const setGymName = useCallback(
    (name: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (name) {
        params.set("gymName", name)
      } else {
        params.delete("gymName")
      }
      params.set("page", "1")
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  const setSortOrder = useCallback(
    (order: SortOrder) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sortOrder", order)
      params.set("page", "1")
      router.replace(`?${params.toString()}`)
    },
    [searchParams, router],
  )

  return { status, page, gymName, sortOrder, setStatus, setPage, setGymName, setSortOrder }
}
```

- [ ] **Step 2: Rodar o teste para verificar que passa**

```bash
cd apps/frontend && pnpm test -- use-check-in-filters.test 2>&1 | tail -20
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
  apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts \
  apps/frontend/src/features/check-ins/hooks/use-check-in-filters.test.ts
git commit -m "feat(check-ins): extend useCheckInFilters with gymName and sortOrder"
```

## Critérios de Sucesso

- `useCheckInFilters()` retorna `gymName`, `sortOrder`, `setGymName`, `setSortOrder`
- `setGymName("smartfit")` persiste `gymName=smartfit` na URL e reseta `page=1`
- `setGymName("")` remove o parâmetro `gymName` da URL
- `setSortOrder("asc")` persiste `sortOrder=asc` na URL e reseta `page=1`
- `sortOrder` default é `"desc"` quando ausente da URL
- `gymName` default é `""` quando ausente da URL
- Parâmetros existentes (`status`, `page`) são preservados ao alterar `gymName` ou `sortOrder`
- `pnpm test` e `pnpm tsc:check` passam
- RF-006 (setGymName): ✅
- RF-011 (gymName na URL): ✅
- RF-012 (setSortOrder): ✅
- RF-015 (sortOrder na URL): ✅
- RF-017 (URL state para compartilhamento): ✅
