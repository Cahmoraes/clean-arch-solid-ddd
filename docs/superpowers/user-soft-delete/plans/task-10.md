# Task 10: Hook `useDeleteUser` + teste [RF-018, RF-020]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-09

## Visão Geral

Cria o hook de mutação `useDeleteUser` (TanStack Query) que chama `DELETE /users/{userId}`, aplica optimistic update removendo o usuário da lista, faz rollback em erro e invalida `ADMIN_USERS_QUERY_KEY` + `USER_STATS_QUERY_KEY` em `onSettled`. Segue exatamente o padrão de `use-suspend-user.ts`. Erros são normalizados para `ApiError` (RF-020).

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-delete-user.ts`
- Test: `apps/frontend/src/features/admin/api/use-delete-user.test.tsx`

### Conformidade com as Skills Padrão

- use skill `tanstack-query-best-practices`: optimistic update + rollback + invalidação em `onSettled`.
- use skill `test-antipatterns`: teste via MSW e `renderHook`, sem mockar o cliente HTTP.
- use skill `code-style`: espelhe o estilo de `use-suspend-user.ts` (indentação tab, PT-BR nos testes).

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/api/use-delete-user.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useDeleteUser } from "./use-delete-user"
import { adminUsersQueryKey, type UseUsersResult } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const QUERY_PARAMS = { page: 1, limit: 10 }

const USER_A = {
	id: "u1",
	name: "Ana",
	email: "ana@example.com",
	role: "MEMBER" as const,
	status: "activated" as const,
	createdAt: "2024-01-01T00:00:00.000Z",
}
const USER_B = { ...USER_A, id: "u2", name: "Bruno", email: "bruno@example.com" }

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Number.POSITIVE_INFINITY, staleTime: 0 },
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

describe("useDeleteUser", () => {
	test("remove o usuário do cache após exclusão bem-sucedida (204)", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData<UseUsersResult>(adminUsersQueryKey(QUERY_PARAMS), {
			users: [USER_A, USER_B],
			pagination: { total: 2, page: 1, limit: 10 },
		})
		server.use(
			http.delete(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({}, { status: 204 }),
			),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})
		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		const data = queryClient.getQueryData<UseUsersResult>(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(data?.users.map((u) => u.id)).toEqual(["u2"])
	})

	test("restaura a lista anterior em caso de erro da API", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData<UseUsersResult>(adminUsersQueryKey(QUERY_PARAMS), {
			users: [USER_A, USER_B],
			pagination: { total: 2, page: 1, limit: 10 },
		})
		server.use(
			http.delete(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
			),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})
		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		const data = queryClient.getQueryData<UseUsersResult>(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(data?.users.map((u) => u.id)).toEqual(["u1", "u2"])
	})

	test("invalida a query de listagem após a mutação (onSettled)", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData<UseUsersResult>(adminUsersQueryKey(QUERY_PARAMS), {
			users: [USER_A],
			pagination: { total: 1, page: 1, limit: 10 },
		})
		server.use(
			http.delete(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({}, { status: 204 }),
			),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})
		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(
			queryClient.getQueryState(adminUsersQueryKey(QUERY_PARAMS))?.isInvalidated,
		).toBe(true)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "useDeleteUser"`
Expected: FAIL — `use-delete-user` não existe.

- **Step 3: Criar o hook**

Crie `apps/frontend/src/features/admin/api/use-delete-user.ts`:

```typescript
"use client"

import type { QueryKey, UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
import { ADMIN_USERS_QUERY_KEY, type UseUsersResult } from "./use-users"

type Context = [QueryKey, UseUsersResult | undefined][]

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

export function useDeleteUser(): UseMutationResult<void, ApiError, string> {
	const queryClient = useQueryClient()

	return useMutation<void, ApiError, string, Context>({
		mutationFn: async (userId: string) => {
			const { error } = await api.DELETE("/users/{userId}", {
				params: { path: { userId } },
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
						users: old.users.filter((user) => user.id !== userId),
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
			void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
		},
	})
}
```

> Confirme o caminho real de `ApiError`/`mapStatusToMessage` (em `use-suspend-user.ts` é `@/lib/errors`). Confirme também a assinatura de `api.DELETE` gerada pelo openapi-fetch para `/users/{userId}` — o formato `{ params: { path: { userId } } }` é o padrão do openapi-fetch para path params.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "useDeleteUser"`
Expected: PASS (3 testes verdes).

- **Step 5: Validar lint e tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/api/use-delete-user.ts apps/frontend/src/features/admin/api/use-delete-user.test.tsx
git commit -m "feat(frontend): add useDeleteUser mutation hook"
```

## Critérios de Sucesso

- `useDeleteUser` chama `DELETE /users/{userId}`, remove o usuário da lista (optimistic), faz rollback em erro e invalida lista + stats (RF-018).
- Erros normalizados para `ApiError` (RF-020).
- Os 3 testes passam; `lint:fix` e `tsc:check` passam.
