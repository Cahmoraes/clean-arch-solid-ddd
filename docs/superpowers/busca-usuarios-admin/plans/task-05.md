# Task 5: Frontend — useDebounce + useUsers

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Criar o hook utilitário `useDebounce` e atualizar `useUsers()` para aceitar `query?: string`, incluí-la na query key do TanStack Query e passá-la como query param na chamada HTTP. Adicionar testes para ambos.

**Pré-requisito:** Task 4 concluída (tipos gerados com `query?: string` no `GET /users`).

## Arquivos

- Create: `apps/frontend/src/hooks/use-debounce.ts`
- Modify: `apps/frontend/src/features/admin/api/use-users.ts`
- Modify: `apps/frontend/src/features/admin/api/use-users.test.tsx`

## Conformidade com as Competências Padrão

- `test-driven-development`: escrever testes antes de implementar
- `react`: hooks custom seguem convenções React (useEffect cleanup, tipos genéricos)

## Passos

- [ ] **Step 1: Escrever os testes do `useDebounce` (novo arquivo de teste)**

Criar `apps/frontend/src/hooks/use-debounce.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounce } from "./use-debounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retorna o valor inicial imediatamente", () => {
    const { result } = renderHook(() => useDebounce("inicial", 500))
    expect(result.current).toBe("inicial")
  })

  it("não atualiza o valor antes do delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "inicial" } },
    )
    rerender({ value: "novo" })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe("inicial")
  })

  it("atualiza o valor após o delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "inicial" } },
    )
    rerender({ value: "novo" })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe("novo")
  })

  it("reinicia o timer quando o valor muda antes do delay expirar", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "a" } },
    )
    rerender({ value: "b" })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    rerender({ value: "c" })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe("a")
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe("c")
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- -t "useDebounce"
```

Resultado esperado: `FAIL` (arquivo `use-debounce.ts` não existe ainda).

- [ ] **Step 3: Criar o hook `useDebounce`**

Criar `apps/frontend/src/hooks/use-debounce.ts`:

```typescript
import { useEffect, useState } from "react"

export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)
		return () => clearTimeout(timer)
	}, [value, delay])

	return debouncedValue
}
```

- [ ] **Step 4: Rodar os testes do `useDebounce` para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "useDebounce"
```

Resultado esperado: todos os 4 testes passando.

- [ ] **Step 5: Escrever os novos testes do `useUsers`**

Abrir `apps/frontend/src/features/admin/api/use-users.test.tsx` e adicionar os seguintes testes ao final do `describe("useUsers")`:

```typescript
it("inclui query param na URL quando fornecido", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.get("query")).toBe("ana")
      return HttpResponse.json(
        {
          users: [
            {
              id: "u1",
              name: "Ana Silva",
              email: "ana@example.com",
              role: "MEMBER",
              status: "activated",
              createdAt: "2024-01-15T12:00:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 10, total: 1 },
        },
        { status: 200 },
      )
    }),
  )

  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10, query: "ana" }),
    { wrapper: wrapper() },
  )

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.users).toHaveLength(1)
  expect(result.current.data?.users[0].name).toBe("Ana Silva")
})

it("não inclui query param quando query é undefined", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.has("query")).toBe(false)
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )

  const { result } = renderHook(
    () => useUsers({ page: 1, limit: 10 }),
    { wrapper: wrapper() },
  )

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

- [ ] **Step 6: Rodar os testes do `useUsers` para confirmar que os novos falham**

```bash
pnpm --filter frontend test -- -t "useUsers"
```

Resultado esperado: os 2 testes novos falham (hook ainda não aceita `query`).

- [ ] **Step 7: Atualizar `useUsers()` para aceitar e usar `query`**

Substituir o conteúdo de `apps/frontend/src/features/admin/api/use-users.ts`:

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

type UsersResponse =
	paths["/users"]["get"]["responses"][200]["content"]["application/json"]

export type AdminUser = UsersResponse["users"][number]
export type AdminUsersPagination = UsersResponse["pagination"]

export interface UseUsersParams {
	page: number
	limit: number
	query?: string
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
	] as const
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function useUsers(
	params: UseUsersParams,
): UseQueryResult<UseUsersResult, ApiError> {
	return useQuery<UseUsersResult, ApiError>({
		queryKey: adminUsersQueryKey(params),
		queryFn: async () => {
			const { data, error } = await api.GET("/users", {
				params: {
					query: { page: params.page, limit: params.limit, query: params.query },
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

- [ ] **Step 8: Rodar todos os testes do `useUsers` para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "useUsers"
```

Resultado esperado: todos os testes passando (incluindo os 2 novos).

- [ ] **Step 9: Verificar TypeScript e lint**

```bash
pnpm --filter frontend tsc:check && pnpm --filter frontend lint:fix
```

Resultado esperado: zero erros.

- [ ] **Step 10: Commit**

```bash
git add apps/frontend/src/hooks/use-debounce.ts apps/frontend/src/hooks/use-debounce.test.ts apps/frontend/src/features/admin/api/use-users.ts apps/frontend/src/features/admin/api/use-users.test.tsx && git commit -m "feat(frontend): adiciona useDebounce e suporte a query no useUsers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `useDebounce<T>(value, delay)` retorna valor debounced; reinicia timer corretamente quando `value` muda antes do delay
- `useUsers()` aceita `query?: string`; query key inclui `query ?? ""`; API call inclui `query` no querystring apenas quando definido
- Todos os testes do `useDebounce` e `useUsers` passam
- `tsc:check` e `lint:fix` passam sem erros
