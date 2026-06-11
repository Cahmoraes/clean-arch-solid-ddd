# Task 10: Frontend — Estender useUsers com filtro de categoria [RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Estende `UseUsersParams` com `filter?: UserFilter`, atualiza `adminUsersQueryKey` para incluir o filtro, e mapeia o valor do filtro para os params `role`/`status` da API. Atualiza também `usePromoteToAdmin` e `useDemoteFromAdmin` para invalidar `USER_STATS_QUERY_KEY` ao se estabelecer, garantindo que os contadores atualizem após uma mudança de role (RF-016). Adiciona testes.

## Arquivos

- Modify: `apps/frontend/src/features/admin/api/use-users.ts`
- Modify: `apps/frontend/src/features/admin/api/use-users.test.tsx`
- Modify: `apps/frontend/src/features/admin/api/use-promote-to-admin.ts`
- Modify: `apps/frontend/src/features/admin/api/use-demote-from-admin.ts`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: `queryKey` inclui todos os params que mudam o resultado
- test-antipatterns: MSW com `server.use()` para sobrescrever handler por teste

## Passos

- [ ] **Step 1: Estender useUsers**

Substitua o conteúdo de `apps/frontend/src/features/admin/api/use-users.ts`:

```typescript
"use client"

import type { paths } from "@repo/api-types"
import {
  keepPreviousData,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { UserFilter } from "../types"

type UsersResponse =
  paths["/users"]["get"]["responses"][200]["content"]["application/json"]

export type AdminUser = UsersResponse["users"][number]
export type AdminUsersPagination = UsersResponse["pagination"]

export interface UseUsersParams {
  page: number
  limit: number
  query?: string
  filter?: UserFilter
}

export interface UseUsersResult {
  users: ReadonlyArray<AdminUser>
  pagination: AdminUsersPagination
}

export const ADMIN_USERS_QUERY_KEY = "admin-users" as const
export const ADMIN_USERS_DEFAULT_LIMIT = 10
export const ADMIN_USERS_STALE_TIME_MS = 30_000

export function adminUsersQueryKey(params: UseUsersParams) {
  return [
    ADMIN_USERS_QUERY_KEY,
    params.page,
    params.limit,
    params.query ?? "",
    params.filter ?? "all",
  ] as const
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message =
    error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}

function buildFilterParams(filter?: UserFilter) {
  if (!filter || filter === "all") return {}
  if (filter === "member") return { role: "MEMBER" as const }
  if (filter === "admin") return { role: "ADMIN" as const }
  if (filter === "active") return { status: "active" as const }
  if (filter === "inactive") return { status: "inactive" as const }
  return {}
}

export function useUsers(
  params: UseUsersParams,
): UseQueryResult<UseUsersResult, ApiError> {
  return useQuery<UseUsersResult, ApiError>({
    queryKey: adminUsersQueryKey(params),
    queryFn: async () => {
      const filterParams = buildFilterParams(params.filter)
      const { data, error } = await api.GET("/users", {
        params: {
          query: {
            page: params.page,
            limit: params.limit,
            query: params.query,
            ...filterParams,
          },
        },
      })
      if (error || !data) throw toApiError(error)
      return { users: data.users, pagination: data.pagination }
    },
    staleTime: ADMIN_USERS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  })
}
```

- [ ] **Step 2: Adicionar testes para o filtro no useUsers**

Abra `apps/frontend/src/features/admin/api/use-users.test.tsx` e adicione ao `describe` existente:

```typescript
test("deve enviar role=MEMBER quando filter='member'", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.get("role")).toBe("MEMBER")
      expect(url.searchParams.has("status")).toBe(false)
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )
  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10, filter: "member" }),
    { wrapper: wrapper() },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})

test("deve enviar role=ADMIN quando filter='admin'", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.get("role")).toBe("ADMIN")
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )
  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10, filter: "admin" }),
    { wrapper: wrapper() },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})

test("deve enviar status=active quando filter='active'", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.get("status")).toBe("active")
      expect(url.searchParams.has("role")).toBe(false)
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )
  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10, filter: "active" }),
    { wrapper: wrapper() },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})

test("não deve enviar role nem status quando filter='all'", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.has("role")).toBe(false)
      expect(url.searchParams.has("status")).toBe(false)
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )
  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10, filter: "all" }),
    { wrapper: wrapper() },
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

- [ ] **Step 3: Rodar os testes de useUsers**

```bash
pnpm --filter frontend test -- -t "useUsers"
```

Esperado: todos os testes PASS (existentes + 4 novos).

- [ ] **Step 4: Invalidar stats em usePromoteToAdmin**

Abra `apps/frontend/src/features/admin/api/use-promote-to-admin.ts` e adicione a importação do `USER_STATS_QUERY_KEY` e a invalidação no `onSettled`:

No topo do arquivo, adicione o import:
```typescript
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
```

No `onSettled`, adicione a invalidação dos stats:
```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
  void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
},
```

- [ ] **Step 5: Invalidar stats em useDemoteFromAdmin**

Abra `apps/frontend/src/features/admin/api/use-demote-from-admin.ts` e aplique a mesma mudança do Step 4:

Adicione o import:
```typescript
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
```

No `onSettled`:
```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
  void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
},
```

- [ ] **Step 6: Rodar todos os testes do frontend**

```bash
pnpm --filter frontend test
```

Esperado: todos os testes passando.

- [ ] **Step 7: Rodar lint e verificar tipos**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Esperado: zero erros.

## Critérios de Sucesso

- `UseUsersParams` aceita `filter?: UserFilter`
- `adminUsersQueryKey` inclui o filtro — sem colisão de cache entre filtros diferentes
- `buildFilterParams` mapeia corretamente: `member` → `role=MEMBER`, `admin` → `role=ADMIN`, `active` → `status=active`, `inactive` → `status=inactive`, `all` → sem params extras
- `usePromoteToAdmin` e `useDemoteFromAdmin` invalidam `USER_STATS_QUERY_KEY` no `onSettled`
- 4 novos testes de useUsers passando
- `lint:fix` e `tsc:check` passam sem erros
