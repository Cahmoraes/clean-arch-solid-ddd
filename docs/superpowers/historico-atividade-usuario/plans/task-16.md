# Task 16: Hook use-user-activity (React Query) [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** standard
**Depends on:** task-15

## Visão Geral

Criar `useUserActivity`, o hook React Query que busca o histórico de atividade de um usuário via `GET /users/{userId}/activity` (task 15), usando o cliente HTTP tipado por OpenAPI (`@repo/api-types`), seguindo exatamente o padrão de `useUsers` (`features/admin/api/use-users.ts`) e `usePublicUser`/`paths["/users/{userId}"]` (`features/profile/api/index.ts`). O hook aceita `enabled` para permitir que o consumidor (task 18) só dispare a busca quando a aba "Atividade" estiver ativa.

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-user-activity.ts`
- Test: `apps/frontend/src/features/admin/api/use-user-activity.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: `queryKey` inclui o `userId` para invalidação/cache por usuário; `enabled` controla o disparo condicional (aba ativa); sem `staleTime` alto necessário aqui pois o histórico é lido sob demanda.
- `typescript-advanced`: o tipo `UserActivityEvent`/`UserActivityResponse` é derivado de `paths["/users/{userId}/activity"]["get"]["responses"][200]["content"]["application/json"]`, mantendo o hook sincronizado com o contrato gerado pelo OpenAPI.
- `test-antipatterns`: o teste usa MSW (`@/test/msw/server`) para simular a resposta HTTP real, não um mock do `api.GET`.

## Passos

- **Step 0: Gerar o cliente OpenAPI tipado**

A rota `GET /users/{userId}/activity` só existe no client tipado (`@repo/api-types`) depois de regenerada a partir do backend (que já expõe a rota real desde a task 15). A partir da raiz do monorepo:

```bash
pnpm run generate:types
```

Isso roda `pnpm --filter backend openapi:export && pnpm --filter @repo/api-types openapi:generate-client`, atualizando os tipos `paths["/users/{userId}/activity"]` consumidos abaixo.

- **Step 1: Escrever o teste falhando**

```typescript
// apps/frontend/src/features/admin/api/use-user-activity.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useUserActivity } from "./use-user-activity"

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

describe("useUserActivity", () => {
	it("retorna a lista de eventos tipada do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, ({ params }) => {
				expect(params.userId).toBe("user-1")
				return HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(() => useUserActivity("user-1"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(result.current.data?.[0].description).toBe("Login realizado")
	})

	it("não dispara a busca quando enabled é false", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () => {
				throw new Error("não deveria ser chamado")
			}),
		)

		const { result } = renderHook(
			() => useUserActivity("user-1", { enabled: false }),
			{ wrapper: wrapper() },
		)

		expect(result.current.isPending).toBe(true)
		expect(result.current.fetchStatus).toBe("idle")
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `vitest run src/features/admin/api/use-user-activity.test.tsx` (a partir de `apps/frontend/`)
Expected: FAIL — `Cannot find module './use-user-activity'` (o hook ainda não existe).

- **Step 3: Implementação mínima**

```typescript
// apps/frontend/src/features/admin/api/use-user-activity.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type UserActivityResponse =
	paths["/users/{userId}/activity"]["get"]["responses"][200]["content"]["application/json"]

export type UserActivityEvent = UserActivityResponse["events"][number]

export const USER_ACTIVITY_QUERY_KEY = "user-activity" as const

export function userActivityQueryKey(userId: string) {
	return [USER_ACTIVITY_QUERY_KEY, userId] as const
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export interface UseUserActivityOptions {
	enabled?: boolean
}

export function useUserActivity(
	userId: string,
	options: UseUserActivityOptions = {},
): UseQueryResult<UserActivityEvent[], ApiError> {
	return useQuery<UserActivityEvent[], ApiError>({
		queryKey: userActivityQueryKey(userId),
		enabled: options.enabled ?? true,
		queryFn: async () => {
			const { data, error } = await api.GET("/users/{userId}/activity", {
				params: { path: { userId } },
			})
			if (error || !data) throw toApiError(error)
			return data.events
		},
	})
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `vitest run src/features/admin/api/use-user-activity.test.tsx` (a partir de `apps/frontend/`)
Expected: PASS — os 2 testes.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/admin/api/use-user-activity.ts apps/frontend/src/features/admin/api/use-user-activity.test.tsx
git commit -m "feat: adiciona hook useUserActivity para o histórico de atividade"
```

## Critérios de Sucesso

- `useUserActivity(userId)` busca `GET /users/{userId}/activity` e retorna `data` tipado como `UserActivityEvent[]` (FR-001).
- `useUserActivity(userId, { enabled: false })` não dispara a requisição (`fetchStatus: "idle"`).
- Erros HTTP são normalizados para `ApiError` via `toApiError`, consistente com `useUsers`.
