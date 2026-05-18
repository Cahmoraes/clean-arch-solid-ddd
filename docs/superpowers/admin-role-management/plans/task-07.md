# Task 7: Frontend — Hook `useDemoteFromAdmin` + Testes [RF-008, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Cria o hook `useDemoteFromAdmin` com optimistic update (role → "MEMBER") e rollback automático em caso de erro. Segue o padrão exato de `use-promote-to-admin.ts`, apenas invertendo o role.

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-demote-from-admin.ts`
- Create: `apps/frontend/src/features/admin/api/use-demote-from-admin.test.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: optimistic update com rollback no `onError`

## Passos

- [ ] **Step 1: Escrever o teste falho**

Crie `apps/frontend/src/features/admin/api/use-demote-from-admin.test.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { adminUsersQueryKey, type UseUsersResult } from "./use-users"
import { useDemoteFromAdmin } from "./use-demote-from-admin"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

const ADMIN_USER = {
  id: "u1",
  name: "Maria",
  email: "maria@example.com",
  role: "ADMIN" as const,
  status: "activated" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

function wrapper(
  queryClient: QueryClient,
): (props: { children: ReactNode }) => React.JSX.Element {
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useDemoteFromAdmin", () => {
  test("aplica optimistic update para role 'MEMBER' antes de a requisição completar", async () => {
    const queryClient = makeQueryClient()
    const initialData: UseUsersResult = {
      users: [ADMIN_USER],
      pagination: { total: 1, page: 1, limit: 10 },
    }
    queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

    let resolveRequest!: () => void
    server.use(
      http.patch(`${apiBaseUrl}/users/demote-admin`, async () => {
        await new Promise<void>((resolve) => {
          resolveRequest = resolve
        })
        return HttpResponse.json({}, { status: 200 })
      }),
    )

    const { result } = renderHook(() => useDemoteFromAdmin(), {
      wrapper: wrapper(queryClient),
    })

    act(() => {
      result.current.mutate("u1")
    })

    await waitFor(() => {
      const data = queryClient.getQueryData<UseUsersResult>(
        adminUsersQueryKey(QUERY_PARAMS),
      )
      expect(data?.users[0]?.role).toBe("MEMBER")
    })

    resolveRequest()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  test("completa a mutação com sucesso quando a API retorna 200", async () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
      users: [ADMIN_USER],
      pagination: { total: 1, page: 1, limit: 10 },
    })

    server.use(
      http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
        HttpResponse.json({}, { status: 200 }),
      ),
    )

    const { result } = renderHook(() => useDemoteFromAdmin(), {
      wrapper: wrapper(queryClient),
    })

    act(() => {
      result.current.mutate("u1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  test("restaura o role anterior no cache em caso de erro da API", async () => {
    const queryClient = makeQueryClient()
    const initialData: UseUsersResult = {
      users: [ADMIN_USER],
      pagination: { total: 1, page: 1, limit: 10 },
    }
    queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

    server.use(
      http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
        HttpResponse.json({ message: "Erro interno" }, { status: 500 }),
      ),
    )

    const { result } = renderHook(() => useDemoteFromAdmin(), {
      wrapper: wrapper(queryClient),
    })

    act(() => {
      result.current.mutate("u1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const restoredData = queryClient.getQueryData<UseUsersResult>(
      adminUsersQueryKey(QUERY_PARAMS),
    )
    expect(restoredData?.users[0]?.role).toBe("ADMIN")
  })

  test("invalida a query de listagem após a mutação (onSettled)", async () => {
    const queryClient = makeQueryClient()
    queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
      users: [ADMIN_USER],
      pagination: { total: 1, page: 1, limit: 10 },
    })

    server.use(
      http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
        HttpResponse.json({}, { status: 200 }),
      ),
    )

    const { result } = renderHook(() => useDemoteFromAdmin(), {
      wrapper: wrapper(queryClient),
    })

    act(() => {
      result.current.mutate("u1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const queryState = queryClient.getQueryState(
      adminUsersQueryKey(QUERY_PARAMS),
    )
    expect(queryState?.isInvalidated).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter frontend test -- -t "useDemoteFromAdmin"
```

Esperado: FAIL — `use-demote-from-admin` não existe ainda.

- [ ] **Step 3: Criar o hook**

Crie `apps/frontend/src/features/admin/api/use-demote-from-admin.ts`:

```typescript
"use client"

import type { QueryKey, UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { ADMIN_USERS_QUERY_KEY, type UseUsersResult } from "./use-users"

type Context = [QueryKey, UseUsersResult | undefined][]

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const message =
    error instanceof Error ? error.message : mapStatusToMessage(500)
  return new ApiError(500, "network_error", message)
}

export function useDemoteFromAdmin(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string, Context>({
    mutationFn: async (userId: string) => {
      const { error } = await api.PATCH("/users/demote-admin", {
        body: { userId },
      })
      if (error) throw toApiError(error)
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })

      const previousQueries = queryClient.getQueriesData<UseUsersResult>({
        queryKey: [ADMIN_USERS_QUERY_KEY],
      })

      queryClient.setQueriesData<UseUsersResult>(
        { queryKey: [ADMIN_USERS_QUERY_KEY] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            users: old.users.map((user) =>
              user.id === userId
                ? { ...user, role: "MEMBER" as const }
                : user,
            ),
          }
        },
      )

      return previousQueries
    },
    onError: (_error, _userId, context) => {
      if (!context) return
      for (const [queryKey, data] of context) {
        queryClient.setQueryData(queryKey, data)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
    },
  })
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "useDemoteFromAdmin"
```

Esperado: 4 testes passam (PASS).

- [ ] **Step 5: Rodar a suite completa**

```bash
pnpm --filter frontend test
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
cd apps/frontend
git add \
  src/features/admin/api/use-demote-from-admin.ts \
  src/features/admin/api/use-demote-from-admin.test.tsx
git commit -m "feat(admin): add useDemoteFromAdmin hook with optimistic update"
```

## Critérios de Sucesso

- Optimistic update aplica `role: "MEMBER"` imediatamente [RF-010]
- Rollback restaura role original ("ADMIN") em caso de erro [RF-010]
- Invalidação de cache em `onSettled` [RF-010]
- 4 testes passam
