# Task 9: Frontend — Hook useUserStats [RF-003, RF-004, RF-016]

**Status:** DONE
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Cria o hook `useUserStats` que busca `GET /users/stats` via TanStack Query com `staleTime` de 30s. Adiciona o handler MSW em `handlers.ts` para os testes. Inclui testes unitários com `renderHook`.

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-user-stats.ts`
- Create: `apps/frontend/src/features/admin/api/use-user-stats.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: `queryKey` estável, `staleTime` explícito
- test-antipatterns: MSW intercepta requests reais — sem mock manual de fetch
- vitest: `describe` + `test`, descrições PT-BR

## Passos

- [ ] **Step 1: Adicionar handler MSW para GET /users/stats**

Abra `apps/frontend/src/test/msw/handlers.ts` e adicione, antes da linha do `http.get(endpoint("/users/:userId")` (importante: `/users/stats` deve vir antes de `/users/:userId` para não ser capturado pelo handler de parâmetro dinâmico):

```typescript
http.get(endpoint("/users/stats"), () =>
  HttpResponse.json(
    {
      total: 0,
      members: 0,
      admins: 0,
      active: 0,
      inactive: 0,
    },
    { status: 200 },
  ),
),
```

- [ ] **Step 2: Escrever o teste falhando**

Crie `apps/frontend/src/features/admin/api/use-user-stats.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useUserStats } from "./use-user-stats"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useUserStats", () => {
  test("deve retornar os contadores de usuários do endpoint", async () => {
    server.use(
      http.get(`${apiBaseUrl}/users/stats`, () =>
        HttpResponse.json(
          {
            total: 50,
            members: 43,
            admins: 7,
            active: 48,
            inactive: 2,
          },
          { status: 200 },
        ),
      ),
    )

    const { result } = renderHook(() => useUserStats(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      total: 50,
      members: 43,
      admins: 7,
      active: 48,
      inactive: 2,
    })
  })

  test("deve entrar em estado de erro quando o endpoint retorna 403", async () => {
    server.use(
      http.get(`${apiBaseUrl}/users/stats`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    )

    const { result } = renderHook(() => useUserStats(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 3: Rodar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "useUserStats"
```

Esperado: FAIL — `useUserStats` não existe.

- [ ] **Step 4: Criar o hook**

Crie `apps/frontend/src/features/admin/api/use-user-stats.ts`:

```typescript
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { UserStats } from "../types"

type StatsResponse =
  paths["/users/stats"]["get"]["responses"][200]["content"]["application/json"]

export const USER_STATS_QUERY_KEY = "user-stats" as const

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const message =
    error instanceof Error ? error.message : mapStatusToMessage(500)
  return new ApiError(500, "network_error", message)
}

export function useUserStats(): UseQueryResult<UserStats, ApiError> {
  return useQuery<UserStats, ApiError>({
    queryKey: [USER_STATS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await (api.GET as any)("/users/stats")
      if (error || !data) throw toApiError(error)
      return data as UserStats
    },
    staleTime: 30_000,
  })
}
```

> **Nota:** se o tipo `paths["/users/stats"]` não existir após `pnpm generate:types`, use a tipagem manual `StatsResponse = UserStats` temporariamente até a Task 6 estar completa.

- [ ] **Step 5: Rodar o teste para confirmar sucesso**

```bash
pnpm --filter frontend test -- -t "useUserStats"
```

Esperado: 2 testes PASS.

- [ ] **Step 6: Rodar lint e verificar tipos**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Esperado: zero erros.

## Critérios de Sucesso

- `useUserStats()` retorna `UserStats` com os 5 campos
- Handler MSW `/users/stats` registrado em `handlers.ts` antes de `/users/:userId`
- 2 testes passando: sucesso e erro 403
- `lint:fix` e `tsc:check` passam sem erros
