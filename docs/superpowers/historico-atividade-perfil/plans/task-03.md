# Task 3: Mover e generalizar o hook `useUserActivity` para `features/activity/` [FR-002, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-perfil.md`
**Spec:** `../specs/historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

Move o hook `useUserActivity` de `features/admin/api/` para `features/activity/api/` (D2) e o generaliza para aceitar `userId` opcional (D3): `undefined` → `GET /users/me/activity`; presente → `GET /users/{userId}/activity`. A query key passa a ser `["user-activity", userId ?? "me"]`, separando o cache entre admin e perfil. O admin continua chamando `useUserActivity(user.id, ...)` — sem mudança de contrato para ele. Adiciona o handler MSW padrão para `/users/me/activity` e remove os arquivos antigos. Depende de task-01 (tipos `paths["/users/me/activity"]` regenerados via `pnpm generate:types`) e de task-02 (admin já importa `ActivityTab` de `features/activity`, mesmo arquivo `user-detail-panel.tsx` sendo tocado aqui).

## Arquivos

- Create: `apps/frontend/src/features/activity/api/use-user-activity.ts`
- Test: `apps/frontend/src/features/activity/api/use-user-activity.test.tsx` (movido de admin + novos casos)
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx` (import do hook)
- Modify: `apps/frontend/src/test/msw/handlers.ts` (handler padrão `/users/me/activity`)
- Delete: `apps/frontend/src/features/admin/api/use-user-activity.ts`
- Delete: `apps/frontend/src/features/admin/api/use-user-activity.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: query key por plano (`userId ?? "me"`), `enabled` para lazy-load, estado de query único — sem lógica duplicada.
- `typescript-advanced`: tipagem do caminho via `paths` do `@repo/api-types` com branch condicional de `userId`.
- `code-style`: convenções de hooks (`use*` camelCase), arquivos kebab-case, imports `@/features/...`.
- `refactoring`: move + generalização preservando o contrato do admin.
- `test-antipatterns`: testes do hook cobrem o comportamento real (URL chamada, query key), sem testar mock.

### Fidelidade Visual

<!-- N/A — hook de dados, sem dimensão visual. Subseção omitida. -->

## Passos

- **Step 1: Escrever o teste do hook no novo local**

Crie `apps/frontend/src/features/activity/api/use-user-activity.test.tsx` com o conteúdo abaixo (versão estendida do teste do admin — preserva os casos existentes e adiciona os casos de `undefined`):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useUserActivity, userActivityQueryKey } from "./use-user-activity"

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
	test("retorna a lista de eventos tipada do MSW quando userId é fornecido", async () => {
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

	test("chama /users/me/activity quando userId é undefined e usa query key me", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "CHECK_IN",
								description: "Check-in realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useUserActivity(undefined), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(userActivityQueryKey(undefined)).toEqual(["user-activity", "me"])
	})

	test("não dispara a busca quando enabled é false", async () => {
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

- **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/features/activity/api/use-user-activity.test.tsx` (a partir de `apps/frontend`)
Expected: FAIL — o módulo `./use-user-activity` ainda não existe em `features/activity/api/`.

- **Step 3: Criar o hook generalizado**

Crie `apps/frontend/src/features/activity/api/use-user-activity.ts`:

```ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type UserActivityResponse =
	paths["/users/{userId}/activity"]["get"]["responses"][200]["content"]["application/json"]

export type UserActivityEvent = UserActivityResponse["events"][number]

export const USER_ACTIVITY_QUERY_KEY = "user-activity" as const

export function userActivityQueryKey(userId: string | undefined) {
	return [USER_ACTIVITY_QUERY_KEY, userId ?? "me"] as const
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
	userId?: string,
	options: UseUserActivityOptions = {},
): UseQueryResult<UserActivityEvent[], ApiError> {
	return useQuery<UserActivityEvent[], ApiError>({
		queryKey: userActivityQueryKey(userId),
		enabled: options.enabled ?? true,
		queryFn: async () => {
			const { data, error } = userId
				? await api.GET("/users/{userId}/activity", {
						params: { path: { userId } },
					})
				: await api.GET("/users/me/activity")
			if (error || !data) throw toApiError(error)
			return data.events
		},
	})
}
```

- **Step 4: Atualizar o admin para importar o hook do novo local**

Em `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`, troque o import do hook:

```tsx
// de:
import { useUserActivity } from "@/features/admin/api/use-user-activity"
// para:
import { useUserActivity } from "@/features/activity/api/use-user-activity"
```

- **Step 5: Adicionar o handler MSW padrão de `/users/me/activity`**

Em `apps/frontend/src/test/msw/handlers.ts`, adicione o handler ANTES do handler `http.get(endpoint("/users/:userId/activity"), ...)` (linha ~99), pois a ordem importa — se o handler com parâmetro vier primeiro, uma requisição para `/users/me/activity` casa com `userId="me"` e o novo handler nunca é alcançado. Insira imediatamente antes dele:

```ts
	http.get(endpoint("/users/me/activity"), () =>
		HttpResponse.json({ events: [] }, { status: 200 }),
	),
	http.get(endpoint("/users/:userId/activity"), () =>
		HttpResponse.json({ events: [] }, { status: 200 }),
	),
```

- **Step 6: Remover os arquivos antigos do admin**

```bash
git rm apps/frontend/src/features/admin/api/use-user-activity.ts apps/frontend/src/features/admin/api/use-user-activity.test.tsx
```

- **Step 7: Rodar os testes para confirmar que passam**

Run: `npx vitest run src/features/activity/api/use-user-activity.test.tsx` (a partir de `apps/frontend`)
Expected: PASS — os três casos passam (userId fornecido, `undefined` com query key "me", `enabled: false`).

Run: `npx vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx` (a partir de `apps/frontend`)
Expected: PASS — o admin continua consumindo o hook do novo local sem regressão.

- **Step 8: Commit** *(execução sequencial apenas — em wave paralela o orquestrador faz o commit na barreira de integração. Se você for um implementador em árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/activity/api apps/frontend/src/features/admin apps/frontend/src/test/msw/handlers.ts
git commit -m "refactor(frontend): move and generalize useUserActivity to features/activity"
```

## Critérios de Sucesso

- `useUserActivity(userId?: string)` em `features/activity/api/`: `undefined` → `GET /users/me/activity`; `userId` → `GET /users/{userId}/activity` (D3).
- Query key `["user-activity", userId ?? "me"]` separa o cache entre admin e perfil.
- Admin continua funcionando com `useUserActivity(user.id, ...)` — teste do `user-detail-panel` passa (FR-002: acesso ao próprio usuário).
- Hook preserva `enabled` para lazy-load (FR-007) — o teste `enabled: false` não dispara busca.
- MSW handler padrão de `/users/me/activity` evita erro de request não tratado nos testes.