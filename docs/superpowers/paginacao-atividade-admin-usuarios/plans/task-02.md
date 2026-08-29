# Task 2: Frontend: hook `useUserActivity` encaminha `page` na variante admin

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/paginacao-atividade-admin-usuarios-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

`useUserActivity(userId, { page })` hoje ignora `page` quando `userId` está definido: `fetchAdminActivity` não envia `page` na query nem repassa `pagination` na resposta, e `userActivityQueryKey` usa uma chave fixa (`["user-activity", "admin", userId]`) independente da página. Esta task espelha o comportamento já existente para `fetchMyActivity`.

## Arquivos

- Modify: `apps/frontend/src/features/activity/api/use-user-activity.ts`
- Test: `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: a `queryKey` precisa incluir `page` para que o cache não misture respostas de páginas diferentes; usar o mesmo padrão já validado na variante `"me"`
- `typescript-advanced`: `UserActivityPagination`/`UserActivityQueryData` já são derivados via `paths["/users/me/activity"]` (openapi-fetch); após a Task 1 regenerar `api-types`, `/users/{userId}/activity` passa a ter o mesmo shape — não introduzir tipos duplicados
- `zod`: não aplicável a este arquivo (sem schema próprio), mas a validação de `page` já ocorre no backend (Task 1); o hook só repassa o valor
- `test-antipatterns`: os testes usam MSW real (`server.use`) para simular o endpoint — não mockar `fetchAdminActivity` diretamente, preservando a cobertura real de integração hook↔API

## Passos

- **Step 1: Atualizar o teste que assume chave administrativa fixa e adicionar o teste de paginação admin**

```typescript
// apps/frontend/src/features/activity/api/use-user-activity.test.tsx
// Substituir o teste "mantém chave administrativa estável e sem colisão com perfil"
// por este (a chave agora inclui page, então deixa de ser igual entre páginas):

	test("inclui a página na chave administrativa e mantém isolamento do perfil", () => {
		expect(userActivityQueryKey("user-1", 1)).toEqual([
			"user-activity",
			"admin",
			"user-1",
			1,
		])
		expect(userActivityQueryKey("user-1", 2)).toEqual([
			"user-activity",
			"admin",
			"user-1",
			2,
		])
		expect(userActivityQueryKey("user-1", 1)).not.toEqual(
			userActivityQueryKey("user-1", 2),
		)
		expect(userActivityQueryKey("me", 1)).not.toEqual(
			userActivityQueryKey(undefined, 1),
		)
	})

// Adicionar este novo teste, no describe("useUserActivity", ...):

	test("repassa page para o endpoint administrativo e retorna paginação", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, ({ request }) => {
				expect(new URL(request.url).searchParams.get("page")).toBe("2")
				return HttpResponse.json(
					{
						events: [],
						pagination: {
							page: 2,
							pageSize: 20,
							total: 21,
							totalPages: 2,
						},
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() => useUserActivity("user-1", { page: 2 }),
			{ wrapper: wrapper() },
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 21,
			totalPages: 2,
		})
	})
```

- **Step 2: Rodar os testes para verificar que falham**

Run (dentro de `apps/frontend`): `npx vitest run src/features/activity/api/use-user-activity.test.tsx`
Expected: FAIL — o teste de chave falha porque `userActivityQueryKey("user-1", 1)` ainda é igual a `userActivityQueryKey("user-1", 2)`; o teste novo falha porque a requisição não envia `?page=2` e a resposta não inclui `pagination`.

- **Step 3: Implementar a mudança no hook**

```typescript
// apps/frontend/src/features/activity/api/use-user-activity.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type UserActivityResponse =
	paths["/users/me/activity"]["get"]["responses"][200]["content"]["application/json"]

export type UserActivityEvent = UserActivityResponse["events"][number]
export type UserActivityEventType = UserActivityEvent["type"]
export type UserActivityPagination = UserActivityResponse["pagination"]

export interface UserActivityQueryData {
	events: UserActivityEvent[]
	pagination?: UserActivityPagination
}

export const USER_ACTIVITY_QUERY_KEY = "user-activity" as const

export function userActivityQueryKey(userId: string | undefined, page = 1) {
	return userId
		? ([USER_ACTIVITY_QUERY_KEY, "admin", userId, page] as const)
		: ([USER_ACTIVITY_QUERY_KEY, "me", page] as const)
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

async function fetchAdminActivity(
	userId: string,
	page: number,
): Promise<UserActivityQueryData> {
	const { data, error } = await api.GET("/users/{userId}/activity", {
		params: { path: { userId }, query: { page } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

async function fetchMyActivity(page: number): Promise<UserActivityQueryData> {
	const { data, error } = await api.GET("/users/me/activity", {
		params: { query: { page } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

function fetchUserActivity(
	userId: string | undefined,
	page: number,
): Promise<UserActivityQueryData> {
	return userId ? fetchAdminActivity(userId, page) : fetchMyActivity(page)
}

function isOutOfRangePagination(
	pagination: UserActivityPagination | undefined,
): boolean {
	if (!pagination || pagination.total <= 0 || pagination.totalPages <= 0) {
		return false
	}
	return pagination.page < 1 || pagination.page > pagination.totalPages
}

function preserveMyActivityPlaceholder(
	previousData: UserActivityQueryData | undefined,
	previousQueryKey: readonly unknown[] | undefined,
): UserActivityQueryData | undefined {
	if (previousQueryKey?.[1] !== "me") return undefined
	if (isOutOfRangePagination(previousData?.pagination)) return undefined
	return previousData
}

export interface UseUserActivityOptions {
	enabled?: boolean
	page?: number
}

export function useUserActivity(
	userId?: string,
	options: UseUserActivityOptions = {},
): UseQueryResult<UserActivityQueryData, ApiError> {
	const page = options.page ?? 1

	return useQuery<UserActivityQueryData, ApiError>({
		queryKey: userActivityQueryKey(userId, page),
		enabled: options.enabled ?? true,
		placeholderData:
			userId === undefined
				? (previousData, previousQuery) =>
						preserveMyActivityPlaceholder(previousData, previousQuery?.queryKey)
				: undefined,
		queryFn: () => fetchUserActivity(userId, page),
	})
}
```

- **Step 4: Rodar os testes para verificar que passam**

Run (dentro de `apps/frontend`): `npx vitest run src/features/activity/api/use-user-activity.test.tsx`
Expected: PASS — todos os testes do arquivo, incluindo os dois alterados/adicionados.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/activity/api/use-user-activity.ts \
  apps/frontend/src/features/activity/api/use-user-activity.test.tsx
git commit -m "feat(activity): hook encaminha page na variante admin"
```

## Critérios de Sucesso

- `userActivityQueryKey(userId, page)` inclui `page` também na variante admin (chaves diferentes por página).
- `useUserActivity(userId, { page })` envia `?page=` na requisição a `/users/{userId}/activity` e expõe `pagination` em `data.pagination`.
- Comportamento da variante `"me"` (perfil) permanece inalterado.
