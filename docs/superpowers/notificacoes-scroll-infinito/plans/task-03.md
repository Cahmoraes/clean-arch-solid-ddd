# Task 3: Frontend — retry automático silencioso ao falhar a busca de um lote [FR-010, FR-011]

**Status:** DONE
**PRD:** ../prd/prd-notificacoes-scroll-infinito.md
**Spec:** ../specs/notificacoes-scroll-infinito-design.md
**Tier:** cheap
**Depends on:** task-02

## Visão Geral

Estender a chamada `useInfiniteQuery` introduzida na task-02, em `apps/frontend/src/lib/notifications/use-notifications.ts`, com uma política de retry explícita (`retry: 3, retryDelay: 0`), garantindo que uma falha ao buscar um lote (inicial ou via `fetchNextPage`) seja automaticamente reprocessada sem exigir ação do usuário e sem exibir mensagem de erro (FR-010). A política é explícita na própria query — não depende do `defaultOptions.queries.retry` do `QueryClient` consumidor (`apps/frontend/src/lib/query-client.ts` usa `retry: 1`; os testes usam clientes com `retry: false`) — porque opções por-query sobrepõem `defaultOptions`. Como o React Query preserva `data.pages` já carregado mesmo quando uma tentativa de `fetchNextPage` falha e esgota as tentativas, nenhuma lógica adicional é necessária para não remover/alterar notificações já exibidas (FR-011) — o comportamento é coberto por teste, não por código extra.

Silencioso para o usuário não é o mesmo que invisível para o time: quando as 3 tentativas se esgotam, o erro é registrado via `logger.error` (`apps/frontend/src/lib/observability.ts`, utilitário já existente no projeto), sem nenhuma UI adicional — permite detectar uma regressão real de rede sem depender de reclamação orgânica de usuário.

## Arquivos

- Modify: `apps/frontend/src/lib/notifications/use-notifications.ts`
- Test: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: configuração de `retry`/`retryDelay` no nível da query (não do `QueryClient` global), e verificação de que `fetchNextPage` falho não limpa `data.pages` — comportamento nativo do React Query que precisa ser exercitado corretamente pelo teste.
- `typescript-advanced`: `retryDelay` tipado como `number | ((failureCount: number, error: ApiError) => number)` — usar a forma numérica fixa (`0`) para manter os testes determinísticos sem fake timers.
- `test-antipatterns`: simular falhas de rede via `mockGet` (contador de chamadas por `offset`), sem mockar `useInfiniteQuery`/o comportamento interno de retry do React Query — o teste deve observar o resultado (dado final presente, sem erro visível) e não a implementação.

## Passos

- **Step 1: Write the failing test**

Adicionar ao arquivo `apps/frontend/src/lib/notifications/use-notifications.test.tsx` (mesmo arquivo/mocks da task-02):

```tsx
describe("retry automático de lote", () => {
	test("tenta novamente automaticamente uma busca de lote que falhou, sem ação do usuário [FR-010]", async () => {
		mockNotificationsRequests(25)
		let secondPageAttempts = 0
		const originalGet = mockGet.getMockImplementation()
		mockGet.mockImplementation((path, options) => {
			const query = options?.params?.query as { offset?: number; limit?: number }
			if (path === "/api/v1/notifications" && query?.offset === 10) {
				secondPageAttempts += 1
				if (secondPageAttempts < 3) {
					return Promise.reject(new Error("network error"))
				}
			}
			return originalGet?.(path, options)
		})
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(secondPageAttempts).toBeGreaterThanOrEqual(3)
		expect(result.current.notifications).toHaveLength(15)
	})

	test("uma falha ao buscar um novo lote não remove notificações já carregadas [FR-011]", async () => {
		mockNotificationsRequests(25)
		const originalGet = mockGet.getMockImplementation()
		mockGet.mockImplementation((path, options) => {
			const query = options?.params?.query as { offset?: number; limit?: number }
			if (path === "/api/v1/notifications" && query?.offset === 10) {
				return Promise.reject(new Error("network error"))
			}
			return originalGet?.(path, options)
		})
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const firstPageNotifications = result.current.notifications
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(result.current.notifications).toEqual(firstPageNotifications)
		expect(result.current.notifications).toHaveLength(10)
	})

	test("registra um log de erro quando as tentativas de retry se esgotam, sem UI de erro", async () => {
		mockNotificationsRequests(25)
		mockGet.mockImplementation((path, options) => {
			const query = options?.params?.query as { offset?: number; limit?: number }
			if (path === "/api/v1/notifications" && query?.offset === 10) {
				return Promise.reject(new Error("network error"))
			}
			return Promise.resolve({
				data: makePaginatedNotificationsResponse(query?.offset ?? 0, query?.limit ?? 10, 25),
				error: undefined,
			})
		})
		const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {})
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(loggerErrorSpy).toHaveBeenCalled()
		loggerErrorSpy.mockRestore()
	})
})
```

Adicionar `import { logger } from "@/lib/observability"` ao topo do arquivo de teste (junto dos demais imports).

- **Step 2: Run test to verify it fails**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: FAIL — a `useInfiniteQuery` da task-02 não define `retry`/`retryDelay` explícitos; com o `QueryClient` de teste (`retry: false` em `createWrapper()`), a primeira falha já marca a query como `isError`, `secondPageAttempts` fica em `1` (não atinge 3), `result.current.notifications` permanece com 10 itens no primeiro teste (esperado 15), e o terceiro teste falha porque nenhum `useEffect` de log existe ainda (`loggerErrorSpy` nunca é chamado).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/lib/notifications/use-notifications.ts`, adicionar `retry`/`retryDelay` à `useInfiniteQuery` já existente (dentro de `useNotifications`):

```ts
const notificationsQuery = useInfiniteQuery<NotificationsPage, ApiError>({
	queryKey: notificationsInfiniteListQueryKey,
	queryFn: ({ pageParam }) =>
		fetchNotifications(pageParam as FetchNotificationsParams),
	initialPageParam: {
		offset: 0,
		limit: NOTIFICATIONS_INITIAL_LIMIT,
	} as FetchNotificationsParams,
	getNextPageParam: (lastPage, allPages) => {
		const loaded = allPages.reduce((sum, page) => sum + page.fetchedCount, 0)
		if (loaded >= lastPage.total) return undefined
		return {
			offset: loaded,
			limit: NOTIFICATIONS_PAGE_LIMIT,
		} satisfies FetchNotificationsParams
	},
	enabled: isAuthenticated,
	retry: 3,
	retryDelay: 0,
})
useEffect(() => {
	if (notificationsQuery.isError) {
		logger.error(
			"Falha ao buscar notificações após esgotar tentativas de retry",
			notificationsQuery.error,
		)
	}
}, [notificationsQuery.isError, notificationsQuery.error])
```

Adicionar `import { useEffect } from "react"` e `import { logger } from "@/lib/observability"` aos imports de `use-notifications.ts`.

- **Step 4: Run test to verify it passes**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: PASS — todos os testes do arquivo, incluindo os 3 novos, passam.

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/lib/notifications/use-notifications.ts \
  apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(notifications): retry automático silencioso ao falhar busca de lote"
```

## Critérios de Sucesso

- Uma falha ao buscar um lote (inicial ou via `fetchNextPage`) é reprocessada automaticamente, sem qualquer ação do usuário e sem mensagem de erro visível (FR-010).
- Após uma falha de busca de um novo lote, as notificações já exibidas permanecem inalteradas — nenhuma é removida ou modificada (FR-011).
- Quando as tentativas de retry se esgotam, um log de erro é registrado via `logger.error`, sem exibir nenhuma UI de erro ao usuário.
