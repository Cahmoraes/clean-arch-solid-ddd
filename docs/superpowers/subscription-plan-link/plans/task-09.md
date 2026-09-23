# Task 9: Frontend: hooks e handlers MSW da assinatura [FR-005, FR-006]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** standard

**Depends on:** task-08

## Visão Geral

Entrega a camada de dados do frontend para o ciclo de vida da assinatura: `useMySubscription` (consulta que trata `null` como resultado normal), `useChangePlan` e `useCancelSubscription` (mutations que invalidam a consulta, inclusive quando o servidor recusa por estado desatualizado) e a invalidação após criar assinatura. Também adiciona handlers MSW padrão para as três rotas, sem os quais os testes existentes da página quebrariam (`onUnhandledRequest: "error"`).

## Arquivos

- Create: `apps/frontend/src/features/subscriptions/api/use-my-subscription.ts`
- Create: `apps/frontend/src/features/subscriptions/api/use-my-subscription.test.tsx`
- Create: `apps/frontend/src/features/subscriptions/api/use-change-plan.ts`
- Create: `apps/frontend/src/features/subscriptions/api/use-change-plan.test.tsx`
- Create: `apps/frontend/src/features/subscriptions/api/use-cancel-subscription.ts`
- Create: `apps/frontend/src/features/subscriptions/api/use-cancel-subscription.test.tsx`
- Modify: `apps/frontend/src/features/subscriptions/api/use-create-subscription.ts`
- Modify: `apps/frontend/src/features/subscriptions/api/use-create-subscription.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`

## Interfaces

- **Consome:** de task-08: `paths["/subscriptions/me"]["get"]["responses"][200]["content"]["application/json"]` (`MySubscription | null`), `paths["/subscriptions/me/plan"]["patch"]` (body `{ priceId: string }`, 200 `MySubscription`), `paths["/subscriptions/me/cancel"]["post"]` (200 `MySubscription`) de `@repo/api-types`. Já existentes: `api` de `@/lib/api` (cliente `openapi-fetch`; um middleware lança `ApiError(status, code, userMessage, details)` em respostas não 2xx), `ApiError` e `mapStatusToMessage` de `@/lib/errors`, `renderWithProviders`/`server` de `@/test/render` e `@/test/msw/server`, `endpoint(path)` de `handlers.ts`.
- **Produz:**
  - `type MySubscription = NonNullable<paths["/subscriptions/me"]["get"]["responses"][200]["content"]["application/json"]>` exportado de `use-my-subscription.ts`.
  - `MY_SUBSCRIPTION_QUERY_KEY = ["subscriptions", "me"] as const` e `useMySubscription(): UseQueryResult<MySubscription | null, ApiError>`.
  - `CHANGE_PLAN_MUTATION_KEY = ["subscriptions", "change-plan"] as const`, `interface ChangePlanInput { priceId: string }` e `useChangePlan(): UseMutationResult<MySubscription, ApiError, ChangePlanInput>`; invalida `MY_SUBSCRIPTION_QUERY_KEY` no sucesso e nos erros 404 e 409.
  - `CANCEL_SUBSCRIPTION_MUTATION_KEY = ["subscriptions", "cancel"] as const` e `useCancelSubscription(): UseMutationResult<MySubscription, ApiError, void>`; invalida `MY_SUBSCRIPTION_QUERY_KEY` no sucesso e no erro 404.
  - `useCreateSubscription` passa a invalidar `MY_SUBSCRIPTION_QUERY_KEY` no sucesso.
  - Handlers MSW padrão: `GET /subscriptions/me` responde 200 `null`; `PATCH /subscriptions/me/plan` e `POST /subscriptions/me/cancel` respondem 200 com uma assinatura de exemplo.

### Conformidade com as Skills Padrão

- `no-workarounds`: o estado desatualizado (409/404) é resolvido invalidando a consulta, sem `setQueryData` manual nem refetch por timer.
- `test-antipatterns`: os testes observam o efeito real (a consulta é buscada de novo via MSW) em vez de espiar `invalidateQueries`.
- `tanstack-query-best-practices`: chave de consulta estável exportada, `retry: 0` em mutations, invalidação no `onSuccess`/`onError`.

## Passos

- **Step 1: Confirm the runner form and the client behavior**

(a) Confirme a forma estreita do runner: `pnpm --filter frontend exec vitest run src/features/subscriptions/api/use-create-subscription.test.tsx` deve coletar exatamente 1 arquivo (o script `test` do pacote não filtra por arquivo e roda todos os ~188; a forma acima é a usada nos passos abaixo). (b) Abra `apps/frontend/src/lib/api.ts` e confirme que o middleware `errorNormalizationMiddleware` lança `ApiError` com o `status` HTTP (por isso `error.status === 409` funciona nos hooks) e que `HttpResponse.json(null)` chega em `api.GET` como `data === null` ou `undefined` (o hook trata os dois com `data ?? null`). (c) Confirme que `packages/api-types/index.d.ts` contém `"/subscriptions/me"` (task-08). (d) Leia `apps/frontend/AGENTS.md` antes de escrever os hooks.

- **Step 2: Write the failing test (useMySubscription)**

Crie `apps/frontend/src/features/subscriptions/api/use-my-subscription.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	MY_SUBSCRIPTION_QUERY_KEY,
	useMySubscription,
} from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const ACTIVE_SUBSCRIPTION = {
	id: "sub-1",
	state: "active",
	plan: { id: "plan-anual", name: "Premium Anual", priceId: "price_demo_yearly" },
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useMySubscription", () => {
	it("devolve a assinatura vigente com plano, período e cancelAtPeriodEnd", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json(ACTIVE_SUBSCRIPTION),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(ACTIVE_SUBSCRIPTION)
	})

	it("trata a ausência de assinatura (200 com null) como resultado normal, não como erro", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json(null, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBeNull()
		expect(result.current.isError).toBe(false)
	})

	it("usa o handler padrão do MSW (sem assinatura) quando o teste não sobrescreve", async () => {
		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBeNull()
	})

	it("expõe ApiError quando o backend falha", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toMatchObject({ status: 500 })
	})

	it("expõe query key estável", () => {
		expect(MY_SUBSCRIPTION_QUERY_KEY).toEqual(["subscriptions", "me"])
	})
})
```

- **Step 3: Write the failing test (useChangePlan)**

Crie `apps/frontend/src/features/subscriptions/api/use-change-plan.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { CHANGE_PLAN_MUTATION_KEY, useChangePlan } from "./use-change-plan"
import { useMySubscription } from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const SUBSCRIPTION = {
	id: "sub-1",
	state: "active",
	plan: { id: "plan-anual", name: "Premium Anual", priceId: "price_demo_yearly" },
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function useBoth() {
	return { query: useMySubscription(), change: useChangePlan() }
}

describe("useChangePlan", () => {
	it("envia o priceId no PATCH e devolve a assinatura atualizada", async () => {
		let received: { priceId: string } | null = null
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, async ({ request }) => {
				received = (await request.json()) as { priceId: string }
				return HttpResponse.json(SUBSCRIPTION)
			}),
		)
		const { result } = renderHook(() => useChangePlan(), { wrapper: wrapper() })

		const response = await result.current.mutateAsync({
			priceId: "price_demo_yearly",
		})

		expect(response).toEqual(SUBSCRIPTION)
		expect(received).toEqual({ priceId: "price_demo_yearly" })
	})

	it("invalida a consulta da assinatura no sucesso (a consulta é buscada de novo)", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(SUBSCRIPTION)
			}),
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () =>
				HttpResponse.json(SUBSCRIPTION),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
		expect(getCalls).toBe(1)

		await result.current.change.mutateAsync({ priceId: "price_demo_yearly" })

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("em 409 (cancelamento agendado) rejeita com ApiError 409 e também invalida a consulta", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(SUBSCRIPTION)
			}),
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () =>
				HttpResponse.json({ message: "conflict" }, { status: 409 }),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await expect(
			result.current.change.mutateAsync({ priceId: "price_demo_yearly" }),
		).rejects.toMatchObject({ status: 409 })

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("não retenta automaticamente em caso de falha", async () => {
		let calls = 0
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () => {
				calls += 1
				return HttpResponse.json({ message: "boom" }, { status: 500 })
			}),
		)
		const { result } = renderHook(() => useChangePlan(), { wrapper: wrapper() })

		await expect(
			result.current.mutateAsync({ priceId: "price_demo_yearly" }),
		).rejects.toMatchObject({ status: 500 })

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(calls).toBe(1)
	})

	it("expõe mutationKey estável", () => {
		expect(CHANGE_PLAN_MUTATION_KEY).toEqual(["subscriptions", "change-plan"])
	})
})
```

- **Step 4: Write the failing test (useCancelSubscription e useCreateSubscription)**

Crie `apps/frontend/src/features/subscriptions/api/use-cancel-subscription.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	CANCEL_SUBSCRIPTION_MUTATION_KEY,
	useCancelSubscription,
} from "./use-cancel-subscription"
import { useMySubscription } from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const ACTIVE = {
	id: "sub-1",
	state: "active",
	plan: { id: "plan-anual", name: "Premium Anual", priceId: "price_demo_yearly" },
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}
const SCHEDULED = { ...ACTIVE, state: "cancel_scheduled", cancelAtPeriodEnd: true }

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function useBoth() {
	return { query: useMySubscription(), cancel: useCancelSubscription() }
}

describe("useCancelSubscription", () => {
	it("dispara o POST e devolve a assinatura com cancelamento agendado", async () => {
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json(SCHEDULED),
			),
		)
		const { result } = renderHook(() => useCancelSubscription(), {
			wrapper: wrapper(),
		})

		const response = await result.current.mutateAsync()

		expect(response).toEqual(SCHEDULED)
	})

	it("invalida a consulta da assinatura no sucesso (a consulta é buscada de novo)", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(getCalls === 1 ? ACTIVE : SCHEDULED)
			}),
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json(SCHEDULED),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await result.current.cancel.mutateAsync()

		await waitFor(() =>
			expect(result.current.query.data).toMatchObject({
				cancelAtPeriodEnd: true,
			}),
		)
		expect(getCalls).toBe(2)
	})

	it("em 404 (sem assinatura ativa) rejeita com ApiError 404 e invalida a consulta", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(ACTIVE)
			}),
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json({ message: "no active" }, { status: 404 }),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await expect(result.current.cancel.mutateAsync()).rejects.toMatchObject({
			status: 404,
		})

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("expõe mutationKey estável", () => {
		expect(CANCEL_SUBSCRIPTION_MUTATION_KEY).toEqual(["subscriptions", "cancel"])
	})
})
```

Acrescente ao final de `use-create-subscription.test.tsx` (adicione `import { useMySubscription } from "./use-my-subscription"` ao bloco de imports):

```tsx
describe("useCreateSubscription e a consulta da assinatura", () => {
	it("invalida a consulta da assinatura após criar (a consulta é buscada de novo)", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(null)
			}),
			http.post(`${apiBaseUrl}/subscriptions`, () =>
				HttpResponse.json(
					{ subscriptionId: "sub_demo_42", status: "active" },
					{ status: 201 },
				),
			),
		)
		const { result } = renderHook(
			() => ({ query: useMySubscription(), create: useCreateSubscription() }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
		expect(getCalls).toBe(1)

		await result.current.create.mutateAsync({
			priceId: "price_demo_monthly",
			paymentMethodId: "pm_demo_card_visa",
		})

		await waitFor(() => expect(getCalls).toBe(2))
	})
})
```

- **Step 5: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/features/subscriptions/api/use-my-subscription.test.tsx src/features/subscriptions/api/use-change-plan.test.tsx src/features/subscriptions/api/use-cancel-subscription.test.tsx src/features/subscriptions/api/use-create-subscription.test.tsx`
Expected: FAIL: os três primeiros arquivos falham com "Failed to resolve import ./use-my-subscription" (e equivalentes); no quarto, o teste de invalidação novo falha (`getCalls` fica em 1) ou o arquivo falha na importação de `./use-my-subscription`.

- **Step 6: Write minimal implementation (hooks)**

Crie `apps/frontend/src/features/subscriptions/api/use-my-subscription.ts`:

```ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type MySubscription = NonNullable<
	paths["/subscriptions/me"]["get"]["responses"][200]["content"]["application/json"]
>

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const MY_SUBSCRIPTION_QUERY_KEY = ["subscriptions", "me"] as const

async function fetchMySubscription(): Promise<MySubscription | null> {
	const { data, error } = await api.GET("/subscriptions/me")
	if (error) throw toApiError(error)
	return data ?? null
}

/**
 * Consulta a assinatura vigente. `null` (200) significa "sem assinatura" e é um
 * resultado normal da tela, não um erro.
 */
export function useMySubscription(): UseQueryResult<
	MySubscription | null,
	ApiError
> {
	return useQuery<MySubscription | null, ApiError>({
		queryKey: MY_SUBSCRIPTION_QUERY_KEY,
		queryFn: fetchMySubscription,
	})
}
```

Crie `apps/frontend/src/features/subscriptions/api/use-change-plan.ts`:

```ts
"use client"

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	MY_SUBSCRIPTION_QUERY_KEY,
	type MySubscription,
} from "./use-my-subscription"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const CHANGE_PLAN_MUTATION_KEY = ["subscriptions", "change-plan"] as const

export interface ChangePlanInput {
	priceId: string
}

const STALE_STATE_STATUSES: ReadonlyArray<number> = [404, 409]

/**
 * Mutation de `PATCH /subscriptions/me/plan`. Em 404/409 a tela está desatualizada
 * (assinatura inexistente ou cancelamento agendado): a consulta é invalidada para
 * recarregar o estado real.
 */
export function useChangePlan(): UseMutationResult<
	MySubscription,
	ApiError,
	ChangePlanInput
> {
	const queryClient = useQueryClient()
	return useMutation<MySubscription, ApiError, ChangePlanInput>({
		mutationKey: CHANGE_PLAN_MUTATION_KEY,
		retry: 0,
		mutationFn: async (input) => {
			const { data, error } = await api.PATCH("/subscriptions/me/plan", {
				body: input,
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })
		},
		onError: async (error) => {
			if (STALE_STATE_STATUSES.includes(error.status)) {
				await queryClient.invalidateQueries({
					queryKey: MY_SUBSCRIPTION_QUERY_KEY,
				})
			}
		},
	})
}
```

Crie `apps/frontend/src/features/subscriptions/api/use-cancel-subscription.ts`:

```ts
"use client"

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	MY_SUBSCRIPTION_QUERY_KEY,
	type MySubscription,
} from "./use-my-subscription"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const CANCEL_SUBSCRIPTION_MUTATION_KEY = [
	"subscriptions",
	"cancel",
] as const

/**
 * Mutation de `POST /subscriptions/me/cancel` (cancelamento ao fim do período,
 * idempotente). Em 404 a tela está desatualizada e a consulta é recarregada.
 */
export function useCancelSubscription(): UseMutationResult<
	MySubscription,
	ApiError,
	void
> {
	const queryClient = useQueryClient()
	return useMutation<MySubscription, ApiError, void>({
		mutationKey: CANCEL_SUBSCRIPTION_MUTATION_KEY,
		retry: 0,
		mutationFn: async () => {
			const { data, error } = await api.POST("/subscriptions/me/cancel")
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })
		},
		onError: async (error) => {
			if (error.status === 404) {
				await queryClient.invalidateQueries({
					queryKey: MY_SUBSCRIPTION_QUERY_KEY,
				})
			}
		},
	})
}
```

Em `use-create-subscription.ts`, troque o import de `@tanstack/react-query` por `import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"`, importe `import { MY_SUBSCRIPTION_QUERY_KEY } from "./use-my-subscription"`, chame `const queryClient = useQueryClient()` no início de `useCreateSubscription` (antes do `return useMutation`) e acrescente ao objeto de opções, depois de `mutationFn`:

```ts
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })
		},
```

- **Step 7: Write minimal implementation (handlers MSW padrão)**

Em `apps/frontend/src/test/msw/handlers.ts`, acrescente antes de `export const handlers`:

```ts
const STUB_MY_SUBSCRIPTION = {
	id: "sub-stub",
	state: "active",
	plan: { id: "plan-stub", name: "Stub Plan", priceId: "price_stub" },
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}
```

e, logo depois da linha `http.get(endpoint("/plans"), ...)` dentro do array `handlers`:

```ts
	http.get(endpoint("/subscriptions/me"), () =>
		HttpResponse.json(null, { status: 200 }),
	),
	http.patch(endpoint("/subscriptions/me/plan"), () =>
		HttpResponse.json(STUB_MY_SUBSCRIPTION, { status: 200 }),
	),
	http.post(endpoint("/subscriptions/me/cancel"), () =>
		HttpResponse.json(
			{ ...STUB_MY_SUBSCRIPTION, state: "cancel_scheduled", cancelAtPeriodEnd: true },
			{ status: 200 },
		),
	),
```

- **Step 8: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/features/subscriptions/api/use-my-subscription.test.tsx src/features/subscriptions/api/use-change-plan.test.tsx src/features/subscriptions/api/use-cancel-subscription.test.tsx src/features/subscriptions/api/use-create-subscription.test.tsx`
Expected: PASS, 4 arquivos (incluindo os 4 testes preexistentes de `use-create-subscription.test.tsx`).

- **Step 9: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/frontend/src/features/subscriptions/api apps/frontend/src/test/msw/handlers.ts
git commit -m "feat(frontend): add subscription hooks and default MSW handlers"
```

## Critérios de Sucesso

- `useMySubscription` devolve a assinatura vigente com plano, `state`, período e `cancelAtPeriodEnd` (FR-005) e devolve `null` sem erro quando o backend responde 200 `null` (FR-006).
- `useChangePlan` e `useCancelSubscription` invalidam a consulta e a página recarrega o estado real, inclusive após 409 na troca e 404 no cancelamento.
- `useCreateSubscription` invalida a consulta após criar.
- Os testes existentes que não sobrescrevem `GET /subscriptions/me` não falham por requisição sem handler.
