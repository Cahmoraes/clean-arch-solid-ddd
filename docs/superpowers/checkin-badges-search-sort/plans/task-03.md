# Task 3: Frontend — Contrato de API e hooks de dados [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-011, RF-012, RF-015, RF-017]

**Status:** DONE
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** task-01, task-02

## Visão Geral

Atualiza o contrato de API do frontend para refletir os novos parâmetros do backend:
1. Adiciona `gymName?` e `sortOrder?` a `CheckInsListQuery` em `extended-paths.ts`
2. Adiciona paths dos dois novos endpoints de stats (`/check-ins/stats` e `/check-ins/me/stats`) e o tipo `CheckInStats`
3. Atualiza `checkInsKeys` para incluir `gymName` e `sortOrder` nas query keys (invalidação correta do cache)
4. Atualiza `UseCheckInsParams` e as funções `useMyCheckIns` / `useCheckIns` para aceitar e repassar os novos parâmetros
5. Cria `useMyCheckInStats` e `useAdminCheckInStats` como hooks separados (padrão `useUserStats`)

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/api/extended-paths.ts`
- Modify: `apps/frontend/src/features/check-ins/api/index.ts`
- Create: `apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.ts`
- Create: `apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.ts`
- Modify: `apps/frontend/src/features/check-ins/api/index.test.tsx`
- Create: `apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.test.tsx`
- Create: `apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.test.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: `staleTime: 30_000` nos hooks de stats; `keepPreviousData` nas listas
- code-style: hooks separados por responsabilidade (stats ≠ lista)

## Passos

### Passo 1: Escrever os testes que falham para os novos hooks de stats

Criar `apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useMyCheckInStats } from "./use-my-check-in-stats"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper }
}

describe("useMyCheckInStats", () => {
  it("retorna stats do usuário autenticado", async () => {
    server.use(
      http.get(`${apiBaseUrl}/check-ins/me/stats`, () =>
        HttpResponse.json({ total: 5, pending: 2, validated: 2, rejected: 1 }),
      ),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyCheckInStats(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ total: 5, pending: 2, validated: 2, rejected: 1 })
  })

  it("expõe estado de loading enquanto carrega", async () => {
    server.use(
      http.get(`${apiBaseUrl}/check-ins/me/stats`, async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({ total: 0, pending: 0, validated: 0, rejected: 0 })
      }),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyCheckInStats(), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
```

Criar `apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useAdminCheckInStats } from "./use-admin-check-in-stats"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper }
}

describe("useAdminCheckInStats", () => {
  it("retorna stats de todos os check-ins (admin)", async () => {
    server.use(
      http.get(`${apiBaseUrl}/check-ins/stats`, () =>
        HttpResponse.json({ total: 100, pending: 10, validated: 80, rejected: 10 }),
      ),
    )
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useAdminCheckInStats(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ total: 100, pending: 10, validated: 80, rejected: 10 })
  })
})
```

- [ ] **Step 1: Rodar os testes para verificar que falham**

```bash
cd apps/frontend && pnpm test -- use-my-check-in-stats use-admin-check-in-stats 2>&1 | tail -15
```

Resultado esperado: `FAIL` com `Cannot find module` — os hooks ainda não existem.

### Passo 2: Atualizar `extended-paths.ts` com novos tipos e paths

**`apps/frontend/src/features/check-ins/api/extended-paths.ts`** — conteúdo completo atualizado:

```typescript
import type { Client } from "openapi-fetch"
import { getApi } from "@/lib/api"

export interface CheckIn {
  id: string
  gymId: string
  gymTitle?: string | null
  userId?: string
  validatedAt: string | null
  rejectedAt: string | null
  status: "pending" | "validated" | "rejected"
  createdAt: string
}

export interface PaginatedCheckIns {
  items: CheckIn[]
  page: number
  total: number
}

export type SortOrder = "asc" | "desc"

export interface CheckInsListQuery {
  page?: number
  status?: "pending" | "validated" | "rejected"
  gymName?: string
  sortOrder?: SortOrder
}

export interface CheckInStats {
  total: number
  pending: number
  validated: number
  rejected: number
}

export interface CheckInExtendedPaths {
  "/check-ins": {
    get: {
      parameters: { query?: CheckInsListQuery }
      responses: {
        200: { content: { "application/json": PaginatedCheckIns } }
      }
    }
  }
  "/check-ins/me": {
    get: {
      parameters: { query?: CheckInsListQuery }
      responses: {
        200: { content: { "application/json": PaginatedCheckIns } }
      }
    }
  }
  "/check-ins/stats": {
    get: {
      parameters: {}
      responses: {
        200: { content: { "application/json": CheckInStats } }
      }
    }
  }
  "/check-ins/me/stats": {
    get: {
      parameters: {}
      responses: {
        200: { content: { "application/json": CheckInStats } }
      }
    }
  }
  "/check-ins/validate": {
    patch: {
      requestBody: {
        content: { "application/json": { checkInId: string } }
      }
      responses: {
        200: {
          content: { "application/json": { checkInId: string } }
        }
      }
    }
  }
  "/check-ins/reject": {
    patch: {
      requestBody: {
        content: { "application/json": { checkInId: string } }
      }
      responses: {
        200: {
          content: { "application/json": { rejectedAt: string } }
        }
      }
    }
  }
}

export function getCheckInsExtendedClient(): Client<CheckInExtendedPaths> {
  return getApi() as unknown as Client<CheckInExtendedPaths>
}
```

### Passo 3: Atualizar `api/index.ts` — query keys e hooks de lista

**`apps/frontend/src/features/check-ins/api/index.ts`** — atualizar `checkInsKeys`, `UseCheckInsParams`, `fetchMyCheckIns`, `fetchCheckIns`:

```typescript
// Atualizar checkInsKeys:
export const checkInsKeys = {
  all: ["check-ins"] as const,
  list: (query: CheckInsListQuery) =>
    [
      ...checkInsKeys.all,
      "list",
      query.page ?? 1,
      query.status ?? "all",
      query.gymName ?? "",
      query.sortOrder ?? "desc",
    ] as const,
  mine: (query: CheckInsListQuery) =>
    [
      ...checkInsKeys.all,
      "mine",
      query.page ?? 1,
      query.status ?? "all",
      query.gymName ?? "",
      query.sortOrder ?? "desc",
    ] as const,
  pendingAdmin: (page: number) =>
    [...checkInsKeys.all, "admin-pending", page] as const,
}

// Atualizar UseCheckInsParams:
export interface UseCheckInsParams {
  page: number
  status?: "pending" | "validated" | "rejected"
  gymName?: string
  sortOrder?: SortOrder
}

// Atualizar fetchMyCheckIns e useMyCheckIns:
async function fetchMyCheckIns(query: CheckInsListQuery): Promise<PaginatedCheckIns> {
  const client = getCheckInsExtendedClient()
  const { data, error } = await client.GET("/check-ins/me", { params: { query } })
  if (error || !data) throw toApiError(error)
  return data
}

export function useMyCheckIns(params: UseCheckInsParams): UseQueryResult<PaginatedCheckIns, ApiError> {
  const query: CheckInsListQuery = {
    page: params.page,
    ...(params.status ? { status: params.status } : {}),
    ...(params.gymName ? { gymName: params.gymName } : {}),
    ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
  }
  return useQuery<PaginatedCheckIns, ApiError>({
    queryKey: checkInsKeys.mine(query),
    queryFn: () => fetchMyCheckIns(query),
    placeholderData: keepPreviousData,
  })
}

// Atualizar fetchCheckIns e useCheckIns:
async function fetchCheckIns(query: CheckInsListQuery): Promise<PaginatedCheckIns> {
  const client = getCheckInsExtendedClient()
  const { data, error } = await client.GET("/check-ins", { params: { query } })
  if (error || !data) throw toApiError(error)
  return data
}

export function useCheckIns(params: UseCheckInsParams): UseQueryResult<PaginatedCheckIns, ApiError> {
  const query: CheckInsListQuery = {
    page: params.page,
    ...(params.status ? { status: params.status } : {}),
    ...(params.gymName ? { gymName: params.gymName } : {}),
    ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
  }
  return useQuery<PaginatedCheckIns, ApiError>({
    queryKey: checkInsKeys.list(query),
    queryFn: () => fetchCheckIns(query),
    placeholderData: keepPreviousData,
  })
}
```

Também adicionar os imports de `SortOrder` e verificar que todos os imports existentes continuam presentes.

### Passo 4: Criar `useMyCheckInStats`

Criar `apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.ts`:

```typescript
"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/errors"
import type { CheckInStats } from "../api/extended-paths.js"
import { getCheckInsExtendedClient } from "../api/extended-paths.js"

export const MY_CHECK_IN_STATS_QUERY_KEY = "my-check-in-stats" as const
export const CHECK_IN_STATS_STALE_TIME_MS = 30_000

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(500, "Erro desconhecido")
}

export function useMyCheckInStats(): UseQueryResult<CheckInStats, ApiError> {
  return useQuery<CheckInStats, ApiError>({
    queryKey: [MY_CHECK_IN_STATS_QUERY_KEY],
    queryFn: async () => {
      const client = getCheckInsExtendedClient()
      const { data, error } = await client.GET("/check-ins/me/stats")
      if (error || !data) throw toApiError(error)
      return data
    },
    staleTime: CHECK_IN_STATS_STALE_TIME_MS,
  })
}
```

### Passo 5: Criar `useAdminCheckInStats`

Criar `apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.ts`:

```typescript
"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/errors"
import type { CheckInStats } from "../api/extended-paths.js"
import { getCheckInsExtendedClient } from "../api/extended-paths.js"

export const ADMIN_CHECK_IN_STATS_QUERY_KEY = "admin-check-in-stats" as const
export const CHECK_IN_STATS_STALE_TIME_MS = 30_000

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(500, "Erro desconhecido")
}

export function useAdminCheckInStats(): UseQueryResult<CheckInStats, ApiError> {
  return useQuery<CheckInStats, ApiError>({
    queryKey: [ADMIN_CHECK_IN_STATS_QUERY_KEY],
    queryFn: async () => {
      const client = getCheckInsExtendedClient()
      const { data, error } = await client.GET("/check-ins/stats")
      if (error || !data) throw toApiError(error)
      return data
    },
    staleTime: CHECK_IN_STATS_STALE_TIME_MS,
  })
}
```

**Nota sobre `toApiError`:** Verifique como a função `toApiError` é exportada/importada no arquivo `api/index.ts` existente e reutilize o mesmo padrão nos hooks. Se estiver em `@/lib/errors`, importe de lá em vez de redefinir.

### Passo 6: Adicionar testes para `useMyCheckIns` com gymName e sortOrder em `index.test.tsx`

Abrir `apps/frontend/src/features/check-ins/api/index.test.tsx` e adicionar ao describe existente de `useMyCheckIns`:

```typescript
it("passa gymName como query param na requisição", async () => {
  let receivedUrl = ""
  server.use(
    http.get(`${apiBaseUrl}/check-ins/me`, ({ request }) => {
      receivedUrl = request.url
      return HttpResponse.json({ items: [], page: 1, total: 0 })
    }),
  )
  const { Wrapper } = makeWrapper()
  const { result } = renderHook(
    () => useMyCheckIns({ page: 1, gymName: "smartfit" }),
    { wrapper: Wrapper },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(receivedUrl).toContain("gymName=smartfit")
})

it("passa sortOrder=asc como query param na requisição", async () => {
  let receivedUrl = ""
  server.use(
    http.get(`${apiBaseUrl}/check-ins/me`, ({ request }) => {
      receivedUrl = request.url
      return HttpResponse.json({ items: [], page: 1, total: 0 })
    }),
  )
  const { Wrapper } = makeWrapper()
  const { result } = renderHook(
    () => useMyCheckIns({ page: 1, sortOrder: "asc" }),
    { wrapper: Wrapper },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(receivedUrl).toContain("sortOrder=asc")
})
```

- [ ] **Step 6: Rodar todos os testes do feature check-ins**

```bash
cd apps/frontend && pnpm test -- src/features/check-ins 2>&1 | tail -25
```

Resultado esperado: todos os testes passam, incluindo os novos de stats e os de gymName/sortOrder.

### Passo 7: Type check e lint

- [ ] **Step 7a: Type check**

```bash
cd apps/frontend && pnpm tsc:check 2>&1 | tail -10
```

Resultado esperado: zero erros.

- [ ] **Step 7b: Lint**

```bash
cd apps/frontend && pnpm lint:fix 2>&1 | tail -10
```

Resultado esperado: zero issues.

- [ ] **Step 7c: Commit**

```bash
git add \
  apps/frontend/src/features/check-ins/api/extended-paths.ts \
  apps/frontend/src/features/check-ins/api/index.ts \
  apps/frontend/src/features/check-ins/api/index.test.tsx \
  apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.ts \
  apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.test.tsx \
  apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.ts \
  apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.test.tsx
git commit -m "feat(check-ins): add gymName/sortOrder to API contract and stats hooks"
```

## Critérios de Sucesso

- `useMyCheckIns({ page: 1, gymName: "smart" })` envia `?gymName=smart` para `/check-ins/me`
- `useCheckIns({ page: 1, sortOrder: "asc" })` envia `?sortOrder=asc` para `/check-ins`
- `useMyCheckInStats()` faz GET `/check-ins/me/stats` com `staleTime: 30_000`
- `useAdminCheckInStats()` faz GET `/check-ins/stats` com `staleTime: 30_000`
- `CheckInStats` e `SortOrder` são tipos exportados de `extended-paths.ts`
- `pnpm test` e `pnpm tsc:check` passam no frontend
- RF-001..RF-005 (stats API frontend): ✅
- RF-006 (gymName no hook): ✅
- RF-011 (gymName na query key): ✅
- RF-012 (sortOrder no hook): ✅
- RF-015 (sortOrder na query key): ✅
