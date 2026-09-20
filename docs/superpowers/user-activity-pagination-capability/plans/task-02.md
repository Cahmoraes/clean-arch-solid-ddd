# Task 2: Integrar pageSize ao estado da URL e ao cache da atividade [FR-002, FR-004, FR-005, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-user-activity-pagination-capability.md`
**Spec:** `../specs/user-activity-pagination-capability-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Fazer o frontend interpretar `pageSize` da URL do perfil, enviar o valor ao endpoint de atividade do próprio usuário, incluir `page` e `pageSize` na `queryKey` do perfil, preservar `pageSize` ao navegar entre páginas e canonicalizar valores inválidos para `20` sem loop de `router.replace`. O consumo administrativo do hook continua sem enviar `pageSize`.

## Arquivos

- Create: `apps/frontend/src/features/activity/lib/activity-pagination.test.ts`
- Modify: `apps/frontend/src/features/activity/lib/activity-pagination.ts`
- Modify: `apps/frontend/src/features/activity/api/use-user-activity.ts`
- Modify: `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Test: `apps/frontend/src/features/activity/lib/activity-pagination.test.ts`
- Test: `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: separar cache por combinação de `page` e `pageSize`, sem misturar placeholders de tamanhos diferentes.
- `test-antipatterns`: testar requests MSW, URL e comportamento real de hook/página, não mocks por si só.
- `typescript-advanced`: tipar opções do hook, literais de tamanho e parsers sem casts frágeis.
- `no-workarounds`: centralizar canonicalização e não mascarar resposta divergente com fallback silencioso.

## Passos

- **Step 1: Write the failing test**

Crie `apps/frontend/src/features/activity/lib/activity-pagination.test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import {
	DEFAULT_ACTIVITY_PAGE_SIZE,
	getActivityPageSizeFromParam,
	isValidActivityPageSizeParam,
} from "./activity-pagination"

describe("activity-pagination pageSize helpers", () => {
	test.each([
		["10", 10],
		["20", 20],
		["50", 50],
	])("aceita pageSize válido %s", (param, expected) => {
		expect(isValidActivityPageSizeParam(param)).toBe(true)
		expect(getActivityPageSizeFromParam(param)).toBe(expected)
	})

	test.each([null, "", "5", "100", "abc", "20.5"])(
		"usa 20 para pageSize ausente ou inválido %s",
		(param) => {
			expect(isValidActivityPageSizeParam(param)).toBe(false)
			expect(getActivityPageSizeFromParam(param)).toBe(
				DEFAULT_ACTIVITY_PAGE_SIZE,
			)
		},
	)
})
```

Em `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`, altere o teste `"chama /users/me/activity com página e retorna paginação"` para validar `pageSize` e a query key:

```typescript
test("chama /users/me/activity com página, pageSize e retorna paginação", async () => {
	server.use(
		http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
			const searchParams = new URL(request.url).searchParams
			expect(searchParams.get("page")).toBe("2")
			expect(searchParams.get("pageSize")).toBe("50")
			return HttpResponse.json(
				{
					events: [
						{
							id: "activity-1",
							type: "CHECK_IN",
							description: "Check-in realizado",
							occurredAt: "2025-01-10T12:00:00.000Z",
						},
					],
					pagination: {
						page: 2,
						pageSize: 50,
						total: 51,
						totalPages: 2,
					},
				},
				{ status: 200 },
			)
		}),
	)

	const { result } = renderHook(
		() => useUserActivity(undefined, { page: 2, pageSize: 50 }),
		{
			wrapper: wrapper(),
		},
	)

	await waitFor(() => expect(result.current.isSuccess).toBe(true))
	expect(result.current.data?.events).toHaveLength(1)
	expect(result.current.data?.pagination).toEqual({
		page: 2,
		pageSize: 50,
		total: 51,
		totalPages: 2,
	})
	expect(userActivityQueryKey(undefined, 2, 50)).toEqual([
		"user-activity",
		"me",
		2,
		50,
	])
})
```

Ainda em `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`, adicione:

```typescript
test("não envia pageSize para o endpoint administrativo", async () => {
	server.use(
		http.get(`${apiBaseUrl}/users/:userId/activity`, ({ request }) => {
			const searchParams = new URL(request.url).searchParams
			expect(searchParams.get("page")).toBe("2")
			expect(searchParams.has("pageSize")).toBe(false)
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
		() => useUserActivity("user-1", { page: 2, pageSize: 50 }),
		{ wrapper: wrapper() },
	)

	await waitFor(() => expect(result.current.isSuccess).toBe(true))
	expect(result.current.data?.pagination?.pageSize).toBe(20)
})

test("não reaproveita placeholder de outro pageSize no perfil", async () => {
	server.use(
		http.get(`${apiBaseUrl}/users/me/activity`, async ({ request }) => {
			const searchParams = new URL(request.url).searchParams
			const pageSize = searchParams.get("pageSize") ?? "20"
			if (pageSize === "50") {
				await new Promise((resolve) => setTimeout(resolve, 50))
			}
			return HttpResponse.json(
				{
					events: [
						{
							id: `activity-size-${pageSize}`,
							type: "LOGIN",
							description: `Login com pageSize ${pageSize}`,
							occurredAt: "2025-01-10T12:00:00.000Z",
						},
					],
					pagination: {
						page: 1,
						pageSize: Number(pageSize),
						total: 60,
						totalPages: Math.ceil(60 / Number(pageSize)),
					},
				},
				{ status: 200 },
			)
		}),
	)

	const { result, rerender } = renderHook(
		({ pageSize }: { pageSize: 10 | 50 }) =>
			useUserActivity(undefined, { page: 1, pageSize }),
		{
			initialProps: { pageSize: 10 },
			wrapper: wrapper(),
		},
	)

	await waitFor(() =>
		expect(result.current.data?.events[0].description).toBe(
			"Login com pageSize 10",
		),
	)

	rerender({ pageSize: 50 })

	expect(result.current.data).toBeUndefined()
	expect(result.current.isFetching).toBe(true)
	await waitFor(() =>
		expect(result.current.data?.events[0].description).toBe(
			"Login com pageSize 50",
		),
	)
})
```

Em `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`, adicione dentro de `describe("ProfilePage — aba Atividade", ...)`:

```typescript
test("preserva pageSize ao navegar entre páginas da atividade", async () => {
	const user = userEvent.setup()
	const requestedParams: string[] = []
	server.use(
		http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
			const searchParams = new URL(request.url).searchParams
			requestedParams.push(searchParams.toString())
			const requestedPage = searchParams.get("page") ?? "1"
			const requestedPageSize = searchParams.get("pageSize") ?? "20"
			return HttpResponse.json(
				{
					events: [
						{
							id: `activity-page-${requestedPage}`,
							type: "LOGIN",
							description: `Login da página ${requestedPage}`,
							occurredAt: "2025-01-10T12:00:00.000Z",
						},
					],
					pagination: {
						page: Number(requestedPage),
						pageSize: Number(requestedPageSize),
						total: 120,
						totalPages: 3,
					},
				},
				{ status: 200 },
			)
		}),
	)
	currentSearchParams = new URLSearchParams("filter=all&page=2&pageSize=50")

	renderProfilePageWithStatefulSearchParams()

	await waitFor(() => {
		expect(screen.getByTestId("profile-card")).toBeInTheDocument()
	})
	await user.click(screen.getByRole("tab", { name: "Atividade" }))

	expect(await screen.findByText("Login da página 2")).toBeInTheDocument()

	await user.click(screen.getByTestId("activity-next"))

	expect(replaceMock).toHaveBeenCalledWith("?filter=all&page=3&pageSize=50")
	expect(await screen.findByText("Login da página 3")).toBeInTheDocument()
	expect(requestedParams).toEqual([
		"page=2&pageSize=50",
		"page=3&pageSize=50",
	])
})

test("canonicaliza pageSize inválido para 20 sem repetir replace", async () => {
	const user = userEvent.setup()
	const requestedPageSizes: string[] = []
	server.use(
		http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
			const requestedPageSize =
				new URL(request.url).searchParams.get("pageSize") ?? ""
			requestedPageSizes.push(requestedPageSize)
			return HttpResponse.json(
				{
					events: [
						{
							id: "activity-default-size",
							type: "LOGIN",
							description: "Login com tamanho padrão",
							occurredAt: "2025-01-10T12:00:00.000Z",
						},
					],
					pagination: {
						page: 1,
						pageSize: 20,
						total: 1,
						totalPages: 1,
					},
				},
				{ status: 200 },
			)
		}),
	)
	currentSearchParams = new URLSearchParams("page=1&pageSize=999")

	renderProfilePageWithStatefulSearchParams()

	await waitFor(() => {
		expect(screen.getByTestId("profile-card")).toBeInTheDocument()
	})
	await user.click(screen.getByRole("tab", { name: "Atividade" }))

	await waitFor(() => {
		expect(replaceMock).toHaveBeenCalledWith("?page=1&pageSize=20")
	})
	expect(replaceMock).toHaveBeenCalledTimes(1)
	expect(currentSearchParams.get("pageSize")).toBe("20")
	expect(requestedPageSizes).toEqual(["20"])
	expect(await screen.findByText("Login com tamanho padrão")).toBeInTheDocument()
})
```

Review Focus: o teste de canonicalização cobre URL inválida sem loop de `router.replace`; o teste de placeholder do hook cobre troca rápida entre tamanhos sem exibir dados de uma query anterior.

- **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter frontend exec vitest run src/features/activity/lib/activity-pagination.test.ts
pnpm --filter frontend exec vitest run src/features/activity/api/use-user-activity.test.tsx -t "pageSize|placeholder"
pnpm --filter frontend exec vitest run 'src/app/(authenticated)/perfil/page.test.tsx' -t "pageSize"
```

Expected: FAIL. Os helpers de `pageSize` ainda não existem, o hook ainda não aceita/envia `pageSize`, a query key do perfil ainda não contém o tamanho e a página ainda não canonicaliza/preserva `pageSize`.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/activity/lib/activity-pagination.ts`, adicione os helpers de tamanho:

```typescript
export const ACTIVITY_PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export const DEFAULT_ACTIVITY_PAGE_SIZE = 20

export type ActivityPageSize = (typeof ACTIVITY_PAGE_SIZE_OPTIONS)[number]

export function isActivityPageSize(
	pageSize: number,
): pageSize is ActivityPageSize {
	return ACTIVITY_PAGE_SIZE_OPTIONS.some((option) => option === pageSize)
}

export function isValidActivityPageSizeParam(
	pageSizeParam: string | null,
): boolean {
	const parsedPageSize = Number(pageSizeParam)
	return isActivityPageSize(parsedPageSize)
}

export function getActivityPageSizeFromParam(
	pageSizeParam: string | null,
): ActivityPageSize {
	const parsedPageSize = Number(pageSizeParam)
	if (!isActivityPageSize(parsedPageSize)) {
		return DEFAULT_ACTIVITY_PAGE_SIZE
	}
	return parsedPageSize
}
```

Em `apps/frontend/src/features/activity/api/use-user-activity.ts`, importe o tipo/default:

```typescript
import {
	type ActivityPageSize,
	DEFAULT_ACTIVITY_PAGE_SIZE,
} from "@/features/activity/lib/activity-pagination"
```

Substitua `userActivityQueryKey` por:

```typescript
export function userActivityQueryKey(
	userId: string | undefined,
	page = 1,
	pageSize: ActivityPageSize = DEFAULT_ACTIVITY_PAGE_SIZE,
) {
	return userId
		? ([USER_ACTIVITY_QUERY_KEY, "admin", userId, page] as const)
		: ([USER_ACTIVITY_QUERY_KEY, "me", page, pageSize] as const)
}
```

Substitua `fetchMyActivity` e `fetchUserActivity` por:

```typescript
async function fetchMyActivity(
	page: number,
	pageSize: ActivityPageSize,
): Promise<UserActivityQueryData> {
	const { data, error } = await api.GET("/users/me/activity", {
		params: { query: { page, pageSize } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

function fetchUserActivity(
	userId: string | undefined,
	page: number,
	pageSize: ActivityPageSize,
): Promise<UserActivityQueryData> {
	return userId ? fetchAdminActivity(userId, page) : fetchMyActivity(page, pageSize)
}
```

Substitua `preserveMyActivityPlaceholder` por uma versão que recebe o tamanho esperado:

```typescript
function preserveMyActivityPlaceholder(
	previousData: UserActivityQueryData | undefined,
	previousQueryKey: readonly unknown[] | undefined,
	pageSize: ActivityPageSize,
): UserActivityQueryData | undefined {
	if (previousQueryKey?.[1] !== "me") return undefined
	if (previousQueryKey[3] !== pageSize) return undefined
	if (isOutOfRangePagination(previousData?.pagination)) return undefined
	return previousData
}
```

Atualize `UseUserActivityOptions` e o corpo do hook:

```typescript
export interface UseUserActivityOptions {
	enabled?: boolean
	page?: number
	pageSize?: ActivityPageSize
}

export function useUserActivity(
	userId?: string,
	options: UseUserActivityOptions = {},
): UseQueryResult<UserActivityQueryData, ApiError> {
	const page = options.page ?? 1
	const pageSize = options.pageSize ?? DEFAULT_ACTIVITY_PAGE_SIZE

	return useQuery<UserActivityQueryData, ApiError>({
		queryKey: userActivityQueryKey(userId, page, pageSize),
		enabled: options.enabled ?? true,
		placeholderData:
			userId === undefined
				? (previousData, previousQuery) =>
						preserveMyActivityPlaceholder(
							previousData,
							previousQuery?.queryKey,
							pageSize,
						)
				: undefined,
		queryFn: () => fetchUserActivity(userId, page, pageSize),
	})
}
```

Em `apps/frontend/src/app/(authenticated)/perfil/page.tsx`, importe os helpers:

```typescript
import {
	getActivityPageFromParam,
	getActivityPageSizeFromParam,
	isValidActivityPageParam,
	isValidActivityPageSizeParam,
} from "@/features/activity/lib/activity-pagination"
```

No `ProfilePageContent`, leia e valide `pageSize`:

```typescript
const pageSizeParam = searchParams.get("pageSize")
const hasValidPageSize = isValidActivityPageSizeParam(pageSizeParam)
const pageSize = getActivityPageSizeFromParam(pageSizeParam)
```

Passe `pageSize` ao hook:

```typescript
} = useUserActivity(undefined, {
	enabled: activeTab === "atividade",
	page,
	pageSize,
})
```

Adicione um efeito de canonicalização para `pageSize` inválido:

```typescript
React.useEffect(() => {
	if (pageSizeParam === null || hasValidPageSize) return

	const params = new URLSearchParams(searchParams.toString())
	params.set("pageSize", String(pageSize))
	router.replace(`?${params.toString()}`)
}, [hasValidPageSize, pageSize, pageSizeParam, router, searchParams])
```

Mantenha `pageSize` ao navegar entre páginas preservando os demais parâmetros:

```typescript
function handleActivityPageChange(nextPage: number) {
	const params = new URLSearchParams(searchParams.toString())
	params.set("page", String(nextPage))
	params.set("pageSize", String(pageSize))
	router.replace(`?${params.toString()}`)
}
```

- **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter frontend exec vitest run src/features/activity/lib/activity-pagination.test.ts
pnpm --filter frontend exec vitest run src/features/activity/api/use-user-activity.test.tsx -t "pageSize|placeholder"
pnpm --filter frontend exec vitest run 'src/app/(authenticated)/perfil/page.test.tsx' -t "pageSize"
```

Expected: PASS. Helpers aceitam somente `10`, `20` e `50`; o hook envia `pageSize` apenas para `/users/me/activity`; a query key do perfil contém `page` e `pageSize`; admin não envia `pageSize`; a página preserva `pageSize` ao navegar e canonicaliza inválidos uma única vez.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/features/activity/lib/activity-pagination.ts apps/frontend/src/features/activity/lib/activity-pagination.test.ts apps/frontend/src/features/activity/api/use-user-activity.ts apps/frontend/src/features/activity/api/use-user-activity.test.tsx 'apps/frontend/src/app/(authenticated)/perfil/page.tsx' 'apps/frontend/src/app/(authenticated)/perfil/page.test.tsx'
git commit -m "feat: wire profile activity page size state

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- [FR-002] A consulta do próprio usuário recebe o `pageSize` efetivo da URL.
- [FR-004] A URL da atividade do perfil representa o tamanho selecionado quando ele precisa ser preservado ou canonicalizado.
- [FR-005] Navegar entre páginas preserva `pageSize` e demais parâmetros existentes.
- [FR-007] `pageSize` ausente ou inválido no estado de navegação usa `20`.
- A query key do perfil diferencia `page` e `pageSize`, e a query administrativa continua sem `pageSize`.
