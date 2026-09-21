# Task 3: Mutation deleteNotification com cache otimista [FR-002, FR-003, FR-008, FR-009, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-notification-delete.md`
**Spec:** `../specs/notification-delete-design.md`
**Tier:** capable
**Depends on:** task-02

## Visão Geral

Adiciona ao hook `useNotifications` (`apps/frontend/src/lib/notifications/use-notifications.ts`) a mutation `deleteNotification(id)` com atualização otimista sobre o cache `InfiniteData<NotificationsPage>` da lista e sobre a query separada da contagem de não lidas. Ao excluir: cancela as queries, tira snapshot dos dois caches, remove o item da página, decrementa o `fetchedCount` da página que continha o item e o `total` de todas as páginas (o `getNextPageParam` usa `total` e a soma dos `fetchedCount`), decrementa a contagem só se o item era não lido, e remove a entrada pendente de reaplicação do SSE. Em 204 invalida só a contagem; em 404 mantém a remoção e invalida a lista; em rede/5xx restaura os dois snapshots. O retorno do hook ganha `deleteNotification`, que não lança erro para a UI.

Contexto verificado do cliente HTTP: `src/lib/api.ts` instala um middleware que LANÇA `ApiError(status, code, message, details)` (de `src/lib/errors.ts`, com o campo `status`) para qualquer resposta não ok; falhas de rede lançam o `Error`/`TypeError` original. Por isso o 404 chega à mutation como `ApiError` com `status === 404`, e o helper local `toApiError(error, fallbackStatus = 500)` normaliza o restante para `ApiError(500, "network_error", ...)`.

## Arquivos

- Modify: `apps/frontend/src/lib/notifications/use-notifications.ts`
- Test: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

## Interfaces

- **Consome:** da task-02, o contrato gerado pelo `@repo/api-types`: `paths["/api/v1/notifications/{id}"]["delete"]` (204 sem corpo, 400, 401, 404), chamado por `api.DELETE("/api/v1/notifications/{id}", { params: { path: { id: string } } })` (o `api` de `@/lib/api`, tipado por `createClient<paths>`).
- **Produz:** `UseNotificationsResult.deleteNotification: (notificationId: string) => Promise<void>` (o hook `useNotifications()` passa a devolver esse campo; a promessa resolve sempre, sem lançar erro para a UI).

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: mutação otimista (`cancelQueries`, snapshot, rollback, invalidação seletiva) e `retry: 0`
- `typescript-advanced`: tipos de `InfiniteData<NotificationsPage>` e do contexto da mutation
- `test-antipatterns`: os testes exercitam o hook real com `@/lib/api` mockado só na fronteira HTTP; nenhum método de teste na produção
- `no-workarounds`: sem type assertions nem supressões; o 404 é tratado pelo `status` do `ApiError`, não por texto de mensagem
- `vercel-react-best-practices`: sem closures obsoletas no hook (a mutation lê o cache por `queryClient` e o ref de pendentes do SSE) e sem re-renders extras

## Passos

- **Step 1: Confirmar o contrato gerado e como o status HTTP chega ao hook**

Run: `grep -n '"/api/v1/notifications/{id}"' packages/api-types/index.d.ts`
Expected: mostra o path; o bloco tem `delete:` (a task-02 regenera o contrato). Se o path não existir, a task-02 não foi concluída: pare e reporte.

Leia `apps/frontend/src/lib/errors.ts` e `apps/frontend/src/lib/api.ts` e confirme que `ApiError` tem `public readonly status: number` e que o `errorNormalizationMiddleware` lança `new ApiError(response.status, ...)` quando `response.ok` é falso. Os testes abaixo constroem o 404/5xx com `new ApiError(404, "api_error", "...")`.

- **Step 2: Preparar os dobles de teste (sem rodar)**

Em `use-notifications.test.tsx`:

(a) Adicione o import e o `mockDelete` hoistado, e registre `DELETE` no mock de `@/lib/api`:

```tsx
import { ApiError } from "@/lib/errors"
```

```tsx
const { mockDelete, mockGet, mockPatch, mockUseAuthStore } = vi.hoisted(() => ({
	mockDelete: vi.fn(),
	mockGet: vi.fn(),
	mockPatch: vi.fn(),
	mockUseAuthStore: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
	api: {
		DELETE: mockDelete,
		GET: mockGet,
		PATCH: mockPatch,
	},
}))
```

(b) No `beforeEach` global, logo após o `vi.clearAllMocks()`, restaure o padrão do `DELETE` (204):

```tsx
	mockDelete.mockReset()
	mockDelete.mockResolvedValue({
		error: undefined,
		response: { status: 204 },
	})
```

(c) Antes do `beforeEach`, junto aos helpers, adicione o GET com estado de exclusão e o contador de chamadas:

```tsx
function mockNotificationsRequestsWithDeletedState(
	total: number,
	deletedIds: Set<string>,
): void {
	mockGet.mockImplementation((path, options) => {
		if (path === "/api/v1/notifications") {
			const query = options?.params?.query
			const offset = query?.offset ?? 0
			const limit = query?.limit ?? 10
			const remaining = Array.from({ length: total }, (_, index) =>
				makeNotificationItem(`notification-${index + 1}`, index + 1),
			).filter((notification) => !deletedIds.has(notification.id))
			return Promise.resolve({
				data: {
					notifications: remaining.slice(offset, offset + limit),
					total: remaining.length,
				},
				error: undefined,
			})
		}
		if (path === "/api/v1/notifications/unread-count") {
			return Promise.resolve({ data: { count: 1 }, error: undefined })
		}
		throw new Error(`Unexpected GET: ${String(path)}`)
	})
}

function countGetCalls(path: string): number {
	return mockGet.mock.calls.filter((call) => call[0] === path).length
}
```

(d) Ao final do arquivo, abra o bloco onde os testes deste task serão colocados (os testes dos passos seguintes entram dentro dele):

```tsx
describe("useNotifications: deleteNotification", () => {
	// testes dos passos seguintes
})
```

- **Step 3: Write the failing test (FR-002: remove antes da resposta e chama o DELETE)**

Dentro de `describe("useNotifications: deleteNotification")`:

```tsx
	test("remove o item da lista antes da resposta do servidor e chama DELETE [FR-002]", async () => {
		mockDelete.mockReturnValue(new Promise(() => {}))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(
			result.current.notifications.some((n) => n.id === "notification-3"),
		).toBe(true)

		await act(async () => {
			void result.current.deleteNotification("notification-3")
		})

		await waitFor(() =>
			expect(
				result.current.notifications.some((n) => n.id === "notification-3"),
			).toBe(false),
		)
		expect(result.current.notifications).toHaveLength(9)
		expect(mockDelete).toHaveBeenCalledWith("/api/v1/notifications/{id}", {
			params: { path: { id: "notification-3" } },
		})
	})
```

- **Step 4: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "remove o item da lista antes da resposta"`
Expected: FAIL com `TypeError: result.current.deleteNotification is not a function`.

- **Step 5: Write minimal implementation (request, remoção local e mutation)**

Em `use-notifications.ts`:

(a) Adicione ao `UseNotificationsResult`:

```ts
	deleteNotification: (notificationId: string) => Promise<void>
```

(b) Abaixo de `MarkAsReadContext`:

```ts
interface DeleteNotificationContext {
	previousNotifications?: InfiniteData<NotificationsPage>
	previousUnreadCount?: number
}
```

(c) Abaixo de `markAllNotificationsAsReadRequest`:

```ts
async function deleteNotificationRequest(
	notificationId: string,
): Promise<void> {
	try {
		const { error } = await api.DELETE("/api/v1/notifications/{id}", {
			params: { path: { id: notificationId } },
		})
		if (error) throw toApiError(error)
	} catch (error) {
		throw toApiError(error)
	}
}
```

(d) Abaixo de `applyOptimisticMarkAsRead`:

```ts
function removeNotificationLocally(
	data: InfiniteData<NotificationsPage>,
	notificationId: string,
): InfiniteData<NotificationsPage> {
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			notifications: page.notifications.filter(
				(notification) => notification.id !== notificationId,
			),
		})),
	}
}

function applyOptimisticDelete(
	queryClient: QueryClient,
	notificationId: string,
): DeleteNotificationContext {
	const previousNotifications = queryClient.getQueryData<
		InfiniteData<NotificationsPage>
	>(notificationsInfiniteListQueryKey)
	const previousUnreadCount = queryClient.getQueryData<number>(
		notificationsUnreadCountQueryKey,
	)
	if (previousNotifications) {
		queryClient.setQueryData<InfiniteData<NotificationsPage>>(
			notificationsInfiniteListQueryKey,
			removeNotificationLocally(previousNotifications, notificationId),
		)
	}
	return { previousNotifications, previousUnreadCount }
}
```

(e) Dentro de `useNotifications`, depois de `markAllAsReadMutation`:

```ts
	const deleteNotificationMutation = useMutation<
		void,
		ApiError,
		string,
		DeleteNotificationContext
	>({
		mutationFn: deleteNotificationRequest,
		retry: 0,
		onMutate: async (notificationId) => {
			await Promise.all([
				queryClient.cancelQueries({
					queryKey: notificationsInfiniteListQueryKey,
				}),
				queryClient.cancelQueries({
					queryKey: notificationsUnreadCountQueryKey,
				}),
			])
			return applyOptimisticDelete(queryClient, notificationId)
		},
	})
```

(f) Junto de `markAsRead`/`markAllAsRead`, e no objeto de retorno:

```ts
	async function deleteNotification(notificationId: string): Promise<void> {
		try {
			await deleteNotificationMutation.mutateAsync(notificationId)
		} catch (error) {
			logger.error("Falha ao excluir notificação", error)
		}
	}
```

```ts
		deleteNotification,
```

(o campo entra no `return` do hook, ao lado de `markAllAsRead`.)

- **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "remove o item da lista antes da resposta"`
Expected: PASS.

- **Step 7: Write the failing test (FR-008: contador só decrementa se o item era não lido)**

```tsx
	test("decrementa o contador de não lidas ao excluir uma notificação não lida [FR-008]", async () => {
		mockDelete.mockReturnValue(new Promise(() => {}))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.unreadCount).toBe(1)

		await act(async () => {
			void result.current.deleteNotification("notification-1")
		})

		await waitFor(() => expect(result.current.unreadCount).toBe(0))
	})

	test("mantém o contador de não lidas ao excluir uma notificação já lida [FR-008]", async () => {
		mockDelete.mockReturnValue(new Promise(() => {}))
		mockNotificationsRequestsWithReadState(new Set(["notification-2"]))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))

		await act(async () => {
			void result.current.deleteNotification("notification-2")
		})

		await waitFor(() =>
			expect(
				result.current.notifications.some((n) => n.id === "notification-2"),
			).toBe(false),
		)
		expect(result.current.unreadCount).toBe(1)
	})
```

- **Step 8: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "contador de não lidas ao excluir"`
Expected: FAIL no teste de não lida (`waitFor` expira com `expected 1 to be 0`); o teste da já lida passa, pois o contador não é tocado.

- **Step 9: Write minimal implementation (contador)**

Substitua `applyOptimisticDelete` por:

```ts
function applyOptimisticDelete(
	queryClient: QueryClient,
	notificationId: string,
): DeleteNotificationContext {
	const previousNotifications = queryClient.getQueryData<
		InfiniteData<NotificationsPage>
	>(notificationsInfiniteListQueryKey)
	const previousUnreadCount = queryClient.getQueryData<number>(
		notificationsUnreadCountQueryKey,
	)
	const shouldDecreaseUnreadCount = hasUnreadNotification(
		previousNotifications,
		notificationId,
	)
	if (previousNotifications) {
		queryClient.setQueryData<InfiniteData<NotificationsPage>>(
			notificationsInfiniteListQueryKey,
			removeNotificationLocally(previousNotifications, notificationId),
		)
	}
	if (typeof previousUnreadCount === "number" && shouldDecreaseUnreadCount) {
		queryClient.setQueryData<number>(
			notificationsUnreadCountQueryKey,
			Math.max(previousUnreadCount - 1, 0),
		)
	}
	return { previousNotifications, previousUnreadCount }
}
```

- **Step 10: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "contador de não lidas ao excluir"`
Expected: PASS (2 testes).

- **Step 11: Write the failing test (FR-009: fetchedCount e total mantêm o offset correto)**

```tsx
	test.each([
		["da primeira página", "notification-3"],
		["da segunda página", "notification-13"],
	])("ajusta fetchedCount e total ao excluir um item %s: o próximo fetchNextPage pede o offset correto [FR-009]", async (_label, targetId) => {
		mockDelete.mockReturnValue(new Promise(() => {}))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(result.current.notifications).toHaveLength(15)
		expect(result.current.total).toBe(25)

		await act(async () => {
			void result.current.deleteNotification(targetId)
		})
		await waitFor(() => expect(result.current.total).toBe(24))
		expect(result.current.hasNextPage).toBe(true)

		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", {
			params: {
				query: { page: 1, unreadOnly: false, offset: 14, limit: 5 },
			},
		})
	})
```

- **Step 12: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "ajusta fetchedCount e total"`
Expected: FAIL nos 2 casos (`waitFor` expira com `expected 25 to be 24`), porque o `total` ainda não é decrementado.

- **Step 13: Write minimal implementation (fetchedCount e total)**

Substitua `removeNotificationLocally` por:

```ts
function removeNotificationLocally(
	data: InfiniteData<NotificationsPage>,
	notificationId: string,
): InfiniteData<NotificationsPage> {
	return {
		...data,
		pages: data.pages.map((page) => {
			const notifications = page.notifications.filter(
				(notification) => notification.id !== notificationId,
			)
			const wasInThisPage = notifications.length !== page.notifications.length
			return {
				...page,
				notifications,
				total: Math.max(page.total - 1, 0),
				fetchedCount: wasInThisPage
					? Math.max(page.fetchedCount - 1, 0)
					: page.fetchedCount,
			}
		}),
	}
}
```

- **Step 14: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "ajusta fetchedCount e total"`
Expected: PASS (2 casos: com 15 carregados e 1 excluído, `loaded = 14`, `total = 24`, próximo offset 14).

- **Step 15: Write the failing test (FR-003: rollback em 5xx e em falha de rede)**

```tsx
	test.each([
		["erro 5xx", () => new ApiError(500, "api_error", "Erro interno")],
		["falha de rede", () => new Error("network error")],
	])("restaura item, contador, fetchedCount e total em caso de %s [FR-003]", async (_label, makeError) => {
		mockDelete.mockImplementation(() => Promise.reject(makeError()))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		const idsBefore = result.current.notifications.map((n) => n.id)
		expect(idsBefore).toHaveLength(15)

		await act(async () => {
			await result.current.deleteNotification("notification-3")
		})

		expect(result.current.notifications.map((n) => n.id)).toEqual(idsBefore)
		expect(result.current.unreadCount).toBe(1)
		expect(result.current.total).toBe(25)
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", {
			params: {
				query: { page: 1, unreadOnly: false, offset: 15, limit: 5 },
			},
		})
	})
```

- **Step 16: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "restaura item, contador, fetchedCount e total"`
Expected: FAIL nos 2 casos (`expected [...14 ids] to deeply equal [...15 ids]`), pois não há rollback. `await result.current.deleteNotification(...)` resolve sem lançar porque o hook captura o erro.

- **Step 17: Write minimal implementation (rollback)**

Abaixo de `applyOptimisticDelete` adicione:

```ts
function restoreNotificationsSnapshot(
	queryClient: QueryClient,
	context: DeleteNotificationContext | undefined,
): void {
	if (context?.previousNotifications) {
		queryClient.setQueryData<InfiniteData<NotificationsPage>>(
			notificationsInfiniteListQueryKey,
			context.previousNotifications,
		)
	}
	if (typeof context?.previousUnreadCount === "number") {
		queryClient.setQueryData<number>(
			notificationsUnreadCountQueryKey,
			context.previousUnreadCount,
		)
	}
}
```

E na `deleteNotificationMutation`, após `onMutate`:

```ts
		onError: (_error, _notificationId, context) => {
			restoreNotificationsSnapshot(queryClient, context)
		},
```

- **Step 18: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "restaura item, contador, fetchedCount e total"`
Expected: PASS (2 casos).

- **Step 19: Write the failing test (FR-010: 404 mantém a remoção e invalida a lista)**

```tsx
	test("mantém a remoção e invalida a lista quando o servidor responde 404 [FR-010]", async () => {
		const deletedIds = new Set<string>()
		mockNotificationsRequestsWithDeletedState(25, deletedIds)
		mockDelete.mockImplementation(() => {
			deletedIds.add("notification-2")
			return Promise.reject(
				new ApiError(404, "api_error", "Notification not found"),
			)
		})
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const listCallsBefore = countGetCalls("/api/v1/notifications")

		await act(async () => {
			await result.current.deleteNotification("notification-2")
		})

		await waitFor(() =>
			expect(countGetCalls("/api/v1/notifications")).toBeGreaterThan(
				listCallsBefore,
			),
		)
		expect(
			result.current.notifications.some((n) => n.id === "notification-2"),
		).toBe(false)
		expect(result.current.total).toBe(24)
	})
```

- **Step 20: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "quando o servidor responde 404"`
Expected: FAIL (`waitFor` expira: a lista não é refetchada, pois o `onError` atual faz rollback para qualquer erro e não invalida).

- **Step 21: Write minimal implementation (ramo 404)**

Troque o `onError` da `deleteNotificationMutation` por:

```ts
		onError: (error, _notificationId, context) => {
			if (error.status === 404) {
				void queryClient.invalidateQueries({
					queryKey: notificationsInfiniteListQueryKey,
				})
				return
			}
			restoreNotificationsSnapshot(queryClient, context)
		},
```

- **Step 22: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "quando o servidor responde 404"`
Expected: PASS.

- **Step 23: Write the failing test (204 invalida só a contagem de não lidas)**

```tsx
	test("em 204 invalida só a contagem de não lidas, sem refetch da lista [FR-002]", async () => {
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const listCallsBefore = countGetCalls("/api/v1/notifications")
		const countCallsBefore = countGetCalls("/api/v1/notifications/unread-count")

		await act(async () => {
			await result.current.deleteNotification("notification-1")
		})

		await waitFor(() =>
			expect(
				countGetCalls("/api/v1/notifications/unread-count"),
			).toBeGreaterThan(countCallsBefore),
		)
		expect(countGetCalls("/api/v1/notifications")).toBe(listCallsBefore)
		expect(
			result.current.notifications.some((n) => n.id === "notification-1"),
		).toBe(false)
	})
```

- **Step 24: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "em 204 invalida só a contagem"`
Expected: FAIL (`waitFor` expira: a contagem não é invalidada, `expected 1 to be greater than 1`).

- **Step 25: Write minimal implementation (onSuccess)**

Na `deleteNotificationMutation`, após `onError`:

```ts
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: notificationsUnreadCountQueryKey,
			})
		},
```

- **Step 26: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "em 204 invalida só a contagem"`
Expected: PASS.

- **Step 27: Write the failing test (Review Focus: clique duplo)**

Review Focus: Clique duplo no botão: o segundo DELETE devolve 404 e o item não reaparece

```tsx
	test("Review Focus: clique duplo, o segundo DELETE devolve 404 e o item não reaparece nem é descontado duas vezes [FR-010]", async () => {
		const deletedIds = new Set<string>()
		mockNotificationsRequestsWithDeletedState(25, deletedIds)
		let rejectSecond: (reason: ApiError) => void = () => {}
		mockDelete
			.mockImplementationOnce(() => {
				deletedIds.add("notification-1")
				return Promise.resolve({
					error: undefined,
					response: { status: 204 },
				})
			})
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						rejectSecond = reject
					}),
			)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const listCallsBefore = countGetCalls("/api/v1/notifications")

		await act(async () => {
			void result.current.deleteNotification("notification-1")
			void result.current.deleteNotification("notification-1")
		})

		await waitFor(() => expect(result.current.total).toBe(24))
		expect(
			result.current.notifications.some((n) => n.id === "notification-1"),
		).toBe(false)

		await act(async () => {
			rejectSecond(new ApiError(404, "api_error", "Notification not found"))
		})

		await waitFor(() =>
			expect(countGetCalls("/api/v1/notifications")).toBeGreaterThan(
				listCallsBefore,
			),
		)
		expect(mockDelete).toHaveBeenCalledTimes(2)
		expect(
			result.current.notifications.some((n) => n.id === "notification-1"),
		).toBe(false)
		expect(result.current.total).toBe(24)
	})
```

- **Step 28: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "Review Focus: clique duplo"`
Expected: FAIL (`waitFor` expira com `expected 23 to be 24`): a segunda chamada, com o item já ausente do cache, decrementa `total` de novo.

- **Step 29: Write minimal implementation (só ajusta contadores se o item estava no cache)**

No início de `removeNotificationLocally`, antes do `return`:

```ts
	if (!pagesContainNotification(data.pages, notificationId)) return data
```

(`pagesContainNotification` já existe no arquivo, definida acima de `toStreamedNotificationItem`; se a ordem de declaração incomodar o leitor, não há problema: são declarações de função içadas.)

- **Step 30: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "Review Focus: clique duplo"`
Expected: PASS.

- **Step 31: Write the failing test (Review Focus: pendente do SSE)**

Review Focus: Item excluído ainda pendente de reaplicação do SSE não reaparece na lista

```tsx
	test("Review Focus: item excluído ainda pendente de reaplicação do SSE não reaparece na lista [FR-002]", async () => {
		mockDelete.mockReturnValue(new Promise(() => {}))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
		const streamedId = "notification-streamed-deleted"

		await act(async () => {
			result.current.fetchNextPage()
			streamOptions?.onMessage({
				type: "notification",
				payload: {
					notificationId: streamedId,
					userId: "user-1",
					type: "PROMOTION",
					title: "Nova promoção",
					message: "Você recebeu uma nova promoção.",
				},
			})
			void result.current.deleteNotification(streamedId)
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		await act(async () => {})

		expect(
			result.current.notifications.some((n) => n.id === streamedId),
		).toBe(false)
	})
```

O cenário reproduz a janela de corrida do teste existente "notificação SSE chegando com fetchNextPage em andamento", na qual o item fica pendente em `pendingStreamedNotificationsRef` e o efeito de reaplicação o reinsere.

- **Step 32: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "Review Focus: item excluído ainda pendente"`
Expected: FAIL (`expected true to be false`: o efeito de reaplicação reinsere o item pendente). Se o teste PASSAR antes da implementação, o cenário não reproduziu a janela do pendente: reescreva-o (por exemplo, segurando o GET da 2ª página com uma promessa manual liberada só depois da exclusão) até falhar antes de seguir; não mantenha um teste que passa sem a implementação.

- **Step 33: Write minimal implementation (remover o pendente do SSE)**

No `onMutate` da `deleteNotificationMutation`, como primeira linha:

```ts
		onMutate: async (notificationId) => {
			pendingStreamedNotificationsRef.current.delete(notificationId)
			await Promise.all([
				queryClient.cancelQueries({
					queryKey: notificationsInfiniteListQueryKey,
				}),
				queryClient.cancelQueries({
					queryKey: notificationsUnreadCountQueryKey,
				}),
			])
			return applyOptimisticDelete(queryClient, notificationId)
		},
```

(`pendingStreamedNotificationsRef` é declarado antes de `useNotificationStream`, portanto já está em escopo no ponto da mutation.)

- **Step 34: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "deleteNotification"`
Expected: PASS em todos os testes do `describe("useNotifications: deleteNotification")`.

- **Step 35: Run o arquivo de teste do hook inteiro (regressão de markAsRead e SSE)**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx`
Expected: PASS (nenhum teste pré-existente quebrou com o novo `DELETE` no mock de `@/lib/api`).

- **Step 36: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/lib/notifications/use-notifications.ts apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(notification-delete): adiciona mutation deleteNotification com cache otimista" -m "Claude-Session: https://claude.ai/code/session_01PgFG13SHLTeWfds7Pinf2j"
```

## Critérios de Sucesso

- Ao chamar `deleteNotification(id)` o item some da lista antes da resposta do servidor e o `DELETE /api/v1/notifications/{id}` é chamado com o id [FR-002].
- Em falha de rede ou 5xx o item volta à posição original e contador, `fetchedCount` e `total` são restaurados, sem a UI receber exceção [FR-003].
- O contador de não lidas cai em 1 só quando o item excluído era não lido [FR-008].
- Depois de excluir, o próximo `fetchNextPage` usa o offset correto (`fetchedCount` da página do item e `total` de todas as páginas decrementados), sem pular nem repetir itens [FR-009].
- Em 404 a remoção é mantida e a lista é invalidada; em 204 só a contagem é invalidada; o clique duplo não desconta duas vezes nem faz o item reaparecer; um item pendente de reaplicação do SSE não reaparece [FR-010].
