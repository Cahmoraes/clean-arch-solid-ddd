# Task 9: Frontend — schema zod + hooks TanStack Query + mocks MSW de planos [FR-001, FR-002, FR-003, FR-004, FR-006, FR-007, FR-009]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-04, task-05, task-06, task-07, task-08

## Visão Geral

Camada de dados do admin de planos: schema zod de validação de formulário
(`planAdminSchema`), hooks TanStack Query que consomem `/admin/plans` (`usePlans`,
`useCreatePlan`, `useUpdatePlan`, `useInactivatePlan`, `useReactivatePlan`) e os handlers MSW
permanentes que os testes das tasks 10 e 11 vão reutilizar. `@repo/api-types` hoje **não** expõe
tipos para `/plans`/`/admin/plans` (a rota `/plans` existe no arquivo gerado mas com
`content: never` — sem schema tipado) porque o gerador roda a partir do OpenAPI exportado pelo
backend, e só depois das tasks 4-8 (que adicionaram `OpenApiSchemaBuilder` aos controllers de
`/admin/plans` e reformularam `/plans`) esse spec existe. Por isso o primeiro passo desta task é
regenerar os tipos.

## Arquivos

- Create: `apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.ts`
- Create: `apps/frontend/src/features/plans-admin/api/index.ts`
- Modify: `apps/frontend/src/test/msw/handlers.ts`
- Test: `apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.test.ts`
- Test: `apps/frontend/src/features/plans-admin/api/index.test.tsx`

## Interfaces

- **Consome:** contratos HTTP `POST/GET /admin/plans`, `PUT /admin/plans/:id`, `PATCH
  /admin/plans/:id/inactivate`, `PATCH /admin/plans/:id/reactivate` (tasks 4-7) e `GET /plans`
  (task-08) — via `paths` de `@repo/api-types`, gerado a partir do OpenAPI exportado pelo backend
  dessas tasks.
- **Produz:** `planAdminSchema` (zod) e `type PlanAdminInput = z.infer<typeof planAdminSchema>`
  (`apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.ts`). `PlanAdmin` (tipo de
  resposta de `/admin/plans`), `plansAdminKeys = { all: ["plans-admin"], list: () => [...] }`,
  `usePlans(): UseQueryResult<PlanAdmin[], ApiError>`, `useCreatePlan(): UseMutationResult
  <PlanAdmin, ApiError, PlanAdminInput>`, `useUpdatePlan(): UseMutationResult<PlanAdmin, ApiError,
  { id: string; input: PlanAdminInput }>`, `useInactivatePlan(): UseMutationResult<PlanAdmin,
  ApiError, string>`, `useReactivatePlan(): UseMutationResult<PlanAdmin, ApiError, string>` (todas
  em `apps/frontend/src/features/plans-admin/api/index.ts`) — toda mutation invalida
  `plansAdminKeys.all` em `onSuccess`. Handlers MSW permanentes para `GET/POST /admin/plans`,
  `PUT /admin/plans/:id`, `PATCH /admin/plans/:id/inactivate`, `PATCH
  /admin/plans/:id/reactivate` e `GET /plans` em `apps/frontend/src/test/msw/handlers.ts`.

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: hooks de query/mutation, invalidação de cache por `queryKey`.
- `typescript-advanced`: tipos derivados de `paths` do OpenAPI (`@repo/api-types`), narrowing de
  união `billingPeriod`.

## Passos

- **Step 1: Gerar tipos do OpenAPI (pré-requisito)**

Confirme se `@repo/api-types` já expõe `paths["/admin/plans"]` com um schema de resposta tipado
(não `content: never`):

```bash
grep -n '"/admin/plans"' packages/api-types/index.d.ts
```

Se a rota não existir ou `get.responses[200].content` for `never`, rode, na raiz do monorepo:

```bash
pnpm generate:types
```

Expected: `packages/api-types/index.d.ts` passa a conter `paths["/admin/plans"]` e
`paths["/plans"]` com os schemas de resposta gerados a partir do OpenAPI exportado pelo backend
(tasks 4-8). Reporte explicitamente neste passo se a regeneração foi necessária.

- **Step 2: Write the failing test**

```typescript
// apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.test.ts
import { describe, expect, test } from "vitest"
import { planAdminSchema } from "./plan-admin-schema"

const VALID_INPUT = {
	name: "Premium Mensal",
	price: 49.9,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados"],
	stripePriceId: "",
}

describe("planAdminSchema", () => {
	test("aceita dados válidos", () => {
		const result = planAdminSchema.safeParse(VALID_INPUT)

		expect(result.success).toBe(true)
	})

	test("rejeita nome vazio", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, name: "" })

		expect(result.success).toBe(false)
	})

	test("rejeita preço negativo", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, price: -1 })

		expect(result.success).toBe(false)
	})

	test("aceita preço igual a 0 (plano gratuito)", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, price: 0 })

		expect(result.success).toBe(true)
	})

	test("rejeita lista de features vazia", () => {
		const result = planAdminSchema.safeParse({ ...VALID_INPUT, features: [] })

		expect(result.success).toBe(false)
	})

	test("rejeita billingPeriod fora de monthly/yearly", () => {
		const result = planAdminSchema.safeParse({
			...VALID_INPUT,
			billingPeriod: "weekly",
		})

		expect(result.success).toBe(false)
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/schemas/plan-admin-schema.test.ts`
Expected: FAIL — `Cannot find module './plan-admin-schema'`

- **Step 3: Write minimal implementation**

```typescript
// apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.ts
import { z } from "zod"

export const MIN_PRICE_REAIS = 0
export const NAME_MIN = 1
export const TAGLINE_MIN = 1
export const FEATURES_MIN = 1

export const planAdminSchema = z.object({
	name: z.string().trim().min(NAME_MIN, "Informe o nome do plano."),
	price: z
		.number()
		.min(MIN_PRICE_REAIS, "O preço não pode ser negativo."),
	billingPeriod: z.enum(["monthly", "yearly"], {
		required_error: "Selecione a periodicidade.",
	}),
	tagline: z.string().trim().min(TAGLINE_MIN, "Informe uma descrição curta."),
	features: z
		.array(z.string().trim().min(1, "O benefício não pode ser vazio."))
		.min(FEATURES_MIN, "Informe ao menos um benefício."),
	stripePriceId: z.string().trim().optional().or(z.literal("")),
})

export type PlanAdminInput = z.infer<typeof planAdminSchema>
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/schemas/plan-admin-schema.test.ts`
Expected: PASS

- **Step 4: Write the failing test**

```typescript
// apps/frontend/src/features/plans-admin/api/index.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import {
	plansAdminKeys,
	useCreatePlan,
	usePlans,
} from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const STUB_PLAN = {
	id: "plan-1",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Tagline.",
	features: ["Check-ins ilimitados"],
	isActive: true,
	stripePriceId: "",
}

function wrapper(queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0, staleTime: 0 },
		mutations: { retry: false },
	},
})): {
	Wrapper: (props: { children: ReactNode }) => React.JSX.Element
	queryClient: QueryClient
} {
	return {
		Wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
		queryClient,
	}
}

describe("usePlans", () => {
	test("busca a lista de planos administrativos", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([STUB_PLAN], { status: 200 }),
			),
		)
		const { Wrapper } = wrapper()

		const { result } = renderHook(() => usePlans(), { wrapper: Wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([STUB_PLAN])
	})
})

describe("useCreatePlan", () => {
	test("cria um plano e invalida a lista administrativa", async () => {
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json(STUB_PLAN, { status: 201 }),
			),
		)
		const { Wrapper, queryClient } = wrapper()
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper })
		await result.current.mutateAsync({
			name: "Premium Mensal",
			price: 49.9,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
			stripePriceId: "",
		})

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: plansAdminKeys.all,
		})
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/api/index.test.tsx`
Expected: FAIL — `Cannot find module './index'`

- **Step 5: Write minimal implementation**

```typescript
// apps/frontend/src/features/plans-admin/api/index.ts
"use client"

import type { paths } from "@repo/api-types"
import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { PlanAdminInput } from "@/features/plans-admin/schemas/plan-admin-schema"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type PlanAdmin =
	paths["/admin/plans"]["get"]["responses"][200]["content"]["application/json"][number]

type CreatePlanBody =
	paths["/admin/plans"]["post"]["requestBody"]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const plansAdminKeys = {
	all: ["plans-admin"] as const,
	list: () => [...plansAdminKeys.all, "list"] as const,
}

function toPriceCents(price: number): number {
	return Math.round(price * 100)
}

function buildPlanBody(input: PlanAdminInput): CreatePlanBody {
	return {
		name: input.name,
		priceCents: toPriceCents(input.price),
		billingPeriod: input.billingPeriod,
		tagline: input.tagline,
		features: input.features,
		...(input.stripePriceId ? { stripePriceId: input.stripePriceId } : {}),
	}
}

async function fetchPlansAdmin(): Promise<PlanAdmin[]> {
	const { data, error } = await api.GET("/admin/plans")
	if (error || !data) throw toApiError(error)
	return data
}

export function usePlans(): UseQueryResult<PlanAdmin[], ApiError> {
	return useQuery<PlanAdmin[], ApiError>({
		queryKey: plansAdminKeys.list(),
		queryFn: fetchPlansAdmin,
	})
}

async function createPlanRequest(input: PlanAdminInput): Promise<PlanAdmin> {
	const { data, error } = await api.POST("/admin/plans", {
		body: buildPlanBody(input),
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useCreatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	PlanAdminInput
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, PlanAdminInput>({
		mutationFn: createPlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

export interface UpdatePlanVariables {
	id: string
	input: PlanAdminInput
}

async function updatePlanRequest({
	id,
	input,
}: UpdatePlanVariables): Promise<PlanAdmin> {
	const { data, error } = await api.PUT("/admin/plans/{id}", {
		params: { path: { id } },
		body: buildPlanBody(input),
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useUpdatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	UpdatePlanVariables
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, UpdatePlanVariables>({
		mutationFn: updatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

async function inactivatePlanRequest(id: string): Promise<PlanAdmin> {
	const { data, error } = await api.PATCH("/admin/plans/{id}/inactivate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useInactivatePlan(): UseMutationResult<PlanAdmin, ApiError, string> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, string>({
		mutationFn: inactivatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

async function reactivatePlanRequest(id: string): Promise<PlanAdmin> {
	const { data, error } = await api.PATCH("/admin/plans/{id}/reactivate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useReactivatePlan(): UseMutationResult<PlanAdmin, ApiError, string> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, string>({
		mutationFn: reactivatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}
```

```typescript
// apps/frontend/src/test/msw/handlers.ts — adicionar ao array `handlers`, próximo dos handlers de /gyms
const STUB_ADMIN_PLAN = {
	id: "plan-stub",
	name: "Stub Plan",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Stub tagline.",
	features: ["Stub feature"],
	isActive: true,
	stripePriceId: "",
}

http.get(endpoint("/plans"), () => HttpResponse.json([], { status: 200 })),
http.get(endpoint("/admin/plans"), () =>
	HttpResponse.json([], { status: 200 }),
),
http.post(endpoint("/admin/plans"), () =>
	HttpResponse.json(STUB_ADMIN_PLAN, { status: 201 }),
),
http.put(endpoint("/admin/plans/:id"), () =>
	HttpResponse.json(STUB_ADMIN_PLAN, { status: 200 }),
),
http.patch(endpoint("/admin/plans/:id/inactivate"), () =>
	HttpResponse.json({ ...STUB_ADMIN_PLAN, isActive: false }, { status: 200 }),
),
http.patch(endpoint("/admin/plans/:id/reactivate"), () =>
	HttpResponse.json({ ...STUB_ADMIN_PLAN, isActive: true }, { status: 200 }),
),
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/api/index.test.tsx`
Expected: PASS

- **Step 6: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add packages/api-types/index.d.ts \
  apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.ts \
  apps/frontend/src/features/plans-admin/schemas/plan-admin-schema.test.ts \
  apps/frontend/src/features/plans-admin/api/index.ts \
  apps/frontend/src/features/plans-admin/api/index.test.tsx \
  apps/frontend/src/test/msw/handlers.ts
git commit -m "feat(plans-admin): add schema, TanStack Query hooks and MSW handlers"
```

## Critérios de Sucesso

- `planAdminSchema` aceita `price: 0` (plano gratuito) e rejeita preço negativo, nome vazio,
  periodicidade fora de `monthly`/`yearly` e lista de features vazia (FR-002, FR-003).
- `usePlans`, `useCreatePlan`, `useUpdatePlan`, `useInactivatePlan`, `useReactivatePlan` existem e
  toda mutation invalida `plansAdminKeys.all` em `onSuccess` (FR-001, FR-004, FR-006, FR-007,
  FR-009).
- `@repo/api-types` expõe tipos para `/admin/plans` e `/plans`; se a regeneração foi necessária,
  isso foi reportado explicitamente no Step 1.
- `apps/frontend/src/test/msw/handlers.ts` tem handlers permanentes para toda a superfície
  `/admin/plans` e `/plans`, reutilizáveis pelas tasks 10-12.
