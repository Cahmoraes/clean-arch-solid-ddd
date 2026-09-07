# Task 2: Frontend — migrar useNotifications para useInfiniteQuery com paginação por offset/limit [FR-002, FR-003, FR-004, FR-005]

**Status:** PENDING
**PRD:** ../prd/prd-notificacoes-scroll-infinito.md
**Spec:** ../specs/notificacoes-scroll-infinito-design.md
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Migrar `useNotifications` (`apps/frontend/src/lib/notifications/use-notifications.ts`) de `useQuery` para `useInfiniteQuery` (TanStack Query v5), usando os parâmetros `offset`/`limit` que a task-01 adicionou a `GET /api/v1/notifications` (regenerados em `@repo/api-types`). Carga inicial: `offset=0, limit=10`. Lotes seguintes: `limit=5`, com `offset` acumulado a partir do total já carregado. `getNextPageParam` retorna `undefined` (não há próxima página) assim que a soma de itens carregados atingir `total` — cobrindo tanto o caso de esgotamento do scroll (FR-004) quanto o caso em que o total inicial já cabe na primeira página (FR-005).

A chave de query muda de `notificationsKeys.list(page, unreadOnly)` para `notificationsKeys.infiniteList(unreadOnly)`, pois a lista deixa de ser paginada por página numerada. `notificationsUnreadCountQueryKey` permanece intocada — é uma query independente. O cache de `markAsRead`/`markAllAsRead` (`applyOptimisticMarkAsRead`, `markNotificationAsReadLocally`, `hasUnreadNotification`) precisa ser adaptado para operar sobre `InfiniteData<NotificationsResponse>` (`{ pages, pageParams }`) em vez de `NotificationsResponse` direto, já que o formato do cache mudou.

`UseNotificationsResult` ganha `hasNextPage: boolean`, `fetchNextPage: () => void`, `isFetchingNextPage: boolean`. `notifications` passa a ser o achatamento de todas as páginas (`data.pages.flatMap(p => p.notifications)`), e `total` continua vindo de `data.pages[0]?.total ?? 0`.

## Arquivos

- Modify: `apps/frontend/src/lib/notifications/use-notifications.ts`
- Test: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: uso correto de `useInfiniteQuery` v5 (`initialPageParam`, `getNextPageParam`, `queryFn: ({ pageParam }) => ...`), chaves de query coerentes com o novo formato paginado, e atualização de cache via `setQueryData` operando sobre `InfiniteData<T>`.
- `typescript-advanced`: tipagem de `pageParam` (`{ offset: number; limit: number }`), de `InfiniteData<NotificationsResponse>` e propagação correta desses tipos por todas as funções auxiliares do arquivo (`markNotificationAsReadLocally`, `hasUnreadNotification`, `applyOptimisticMarkAsRead`).
- `test-antipatterns`: os testes devem exercitar o hook via `renderHook` observando o comportamento público (`notifications`, `hasNextPage`, chamadas a `mockGet`), sem mockar o próprio `useInfiniteQuery`.

## Passos

- **Step 1: Write the failing test**

Adicionar ao arquivo existente `apps/frontend/src/lib/notifications/use-notifications.test.tsx` (mantendo os mocks `mockGet`/`mockPatch`/`mockUseAuthStore` já configurados via `vi.hoisted`, o `createWrapper()` local e o `beforeEach` existentes). Trocar `mockNotificationsRequests()` para responder de acordo com `offset`/`limit` recebidos:

```tsx
function makeNotificationItem(id: string, index: number) {
	return {
		id,
		type: "CHECK_IN_APPROVED" as const,
		title: `Notificação ${index}`,
		message: `Mensagem ${index}`,
		gymName: null,
		reason: null,
		readAt: null,
		createdAt: `2024-01-01T10:00:0${index}Z`,
	}
}

function makePaginatedNotificationsResponse(offset: number, limit: number, total: number) {
	const items = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) =>
		makeNotificationItem(`notification-${offset + i + 1}`, offset + i + 1),
	)
	return { notifications: items, total }
}

function mockNotificationsRequests(total: number): void {
	mockGet.mockImplementation((path, options) => {
		if (path === "/api/v1/notifications") {
			const query = options?.params?.query as { offset?: number; limit?: number }
			const offset = query?.offset ?? 0
			const limit = query?.limit ?? 10
			return Promise.resolve({
				data: makePaginatedNotificationsResponse(offset, limit, total),
				error: undefined,
			})
		}
		if (path === "/api/v1/notifications/unread-count") {
			return Promise.resolve({ data: { count: 1 }, error: undefined })
		}
		throw new Error(`Unexpected GET: ${String(path)}`)
	})
}
```

Ajustar `beforeEach` para chamar `mockNotificationsRequests(25)` (total padrão maior que a carga inicial, salvo quando um teste sobrescrever explicitamente).

Adicionar os 4 testes (um por FR):

```tsx
describe("paginação infinita", () => {
	test("busca inicial usa limit=10 [FR-003]", async () => {
		mockNotificationsRequests(25)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", {
			params: {
				query: {
					page: 1,
					unreadOnly: false,
					offset: 0,
					limit: 10,
				},
			},
		})
		expect(result.current.notifications).toHaveLength(10)
	})

	test("busca do próximo lote usa limit=5 [FR-002]", async () => {
		mockNotificationsRequests(25)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", {
			params: {
				query: {
					page: 1,
					unreadOnly: false,
					offset: 10,
					limit: 5,
				},
			},
		})
		expect(result.current.notifications).toHaveLength(15)
	})

	test("hasNextPage vira false e não busca mais quando o total já foi carregado [FR-004]", async () => {
		mockNotificationsRequests(12)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.hasNextPage).toBe(true)
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(result.current.notifications).toHaveLength(12)
		expect(result.current.hasNextPage).toBe(false)
		const listCallsBefore = mockGet.mock.calls.filter(
			(call) => call[0] === "/api/v1/notifications",
		).length
		result.current.fetchNextPage()
		const listCallsAfter = mockGet.mock.calls.filter(
			(call) => call[0] === "/api/v1/notifications",
		).length
		expect(listCallsAfter).toBe(listCallsBefore)
	})

	test("quando total <= 10 nunca dispara busca adicional [FR-005]", async () => {
		mockNotificationsRequests(7)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.notifications).toHaveLength(7)
		expect(result.current.hasNextPage).toBe(false)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: FAIL — `useNotifications` ainda usa `useQuery` com `fetchNotifications()` sem argumentos e query fixa `{page, unreadOnly}`; `result.current.hasNextPage`/`fetchNextPage`/`isFetchingNextPage` são `undefined`, e as asserções de `mockGet` com `offset`/`limit` não batem.

- **Step 3: Write minimal implementation**

Reescrever as partes relevantes de `apps/frontend/src/lib/notifications/use-notifications.ts`:

```ts
import type { paths } from "@repo/api-types"
import {
	type InfiniteData,
	type QueryClient,
	useInfiniteQuery,
	useMutation,
	useQueryClient,
	useQuery,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	type SseMessage,
	useNotificationStream,
} from "./use-notification-stream"

type NotificationsResponse =
	paths["/api/v1/notifications"]["get"]["responses"][200]["content"]["application/json"]
type MarkAsReadResponse =
	paths["/api/v1/notifications/{id}/read"]["patch"]["responses"][200]["content"]["application/json"]

export type NotificationItem = NotificationsResponse["notifications"][number]

export interface UseNotificationsResult {
	notifications: NotificationItem[]
	total: number
	unreadCount: number
	isLoading: boolean
	hasNextPage: boolean
	fetchNextPage: () => void
	isFetchingNextPage: boolean
	markAsRead: (notificationId: string) => Promise<void>
	markAllAsRead: () => Promise<void>
}

interface MarkAsReadContext {
	previousNotifications?: InfiniteData<NotificationsResponse>
	previousUnreadCount?: number
}

interface FetchNotificationsParams {
	offset: number
	limit: number
}

export const NOTIFICATIONS_QUERY_KEY = "notifications" as const
export const NOTIFICATIONS_DEFAULT_PAGE = 1
export const NOTIFICATIONS_DEFAULT_UNREAD_ONLY = false
export const NOTIFICATIONS_INITIAL_LIMIT = 10
export const NOTIFICATIONS_PAGE_LIMIT = 5

export const notificationsKeys = {
	all: [NOTIFICATIONS_QUERY_KEY] as const,
	infiniteList: (unreadOnly: boolean) =>
		[...notificationsKeys.all, "infinite-list", unreadOnly] as const,
	unreadCount: () => [...notificationsKeys.all, "unread-count"] as const,
}

export const notificationsInfiniteListQueryKey = notificationsKeys.infiniteList(
	NOTIFICATIONS_DEFAULT_UNREAD_ONLY,
)
export const notificationsUnreadCountQueryKey = notificationsKeys.unreadCount()

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

async function fetchNotifications({
	offset,
	limit,
}: FetchNotificationsParams): Promise<NotificationsResponse> {
	const { data, error } = await api.GET("/api/v1/notifications", {
		params: {
			query: {
				page: NOTIFICATIONS_DEFAULT_PAGE,
				unreadOnly: NOTIFICATIONS_DEFAULT_UNREAD_ONLY,
				offset,
				limit,
			},
		},
	})
	if (error || !data) throw toApiError(error)
	return data
}

async function fetchUnreadCount(): Promise<number> {
	const { data, error } = await api.GET(
		"/api/v1/notifications/unread-count",
		{},
	)
	if (error || !data) throw toApiError(error)
	return data.count
}

async function markNotificationAsReadRequest(
	notificationId: string,
): Promise<MarkAsReadResponse["readAt"]> {
	const { data, error } = await api.PATCH("/api/v1/notifications/{id}/read", {
		params: { path: { id: notificationId } },
	})
	if (error || !data) throw toApiError(error)
	return data.readAt
}

async function markAllNotificationsAsReadRequest(): Promise<void> {
	const { data, error } = await api.PATCH("/api/v1/notifications/read-all", {})
	if (error || !data) throw toApiError(error)
}

function markNotificationAsReadLocally(
	data: InfiniteData<NotificationsResponse>,
	notificationId: string,
	readAt: string,
): InfiniteData<NotificationsResponse> {
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			notifications: page.notifications.map((notification) => {
				if (notification.id !== notificationId) return notification
				if (notification.readAt) return notification
				return { ...notification, readAt }
			}),
		})),
	}
}

function hasUnreadNotification(
	previousNotifications: InfiniteData<NotificationsResponse> | undefined,
	notificationId: string,
): boolean {
	return (
		previousNotifications?.pages.some((page) =>
			page.notifications.some(
				(notification) =>
					notification.id === notificationId && notification.readAt === null,
			),
		) ?? false
	)
}

function applyOptimisticMarkAsRead(
	queryClient: QueryClient,
	notificationId: string,
): MarkAsReadContext {
	const previousNotifications = queryClient.getQueryData<
		InfiniteData<NotificationsResponse>
	>(notificationsInfiniteListQueryKey)
	const previousUnreadCount = queryClient.getQueryData<number>(
		notificationsUnreadCountQueryKey,
	)
	const shouldDecreaseUnreadCount = hasUnreadNotification(
		previousNotifications,
		notificationId,
	)
	if (previousNotifications) {
		queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
			notificationsInfiniteListQueryKey,
			markNotificationAsReadLocally(
				previousNotifications,
				notificationId,
				new Date().toISOString(),
			),
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

export function useNotifications(): UseNotificationsResult {
	const queryClient = useQueryClient()
	const user = useAuthStore((state) => state.user)
	const isAuthenticated = user !== null
	const notificationsQuery = useInfiniteQuery<NotificationsResponse, ApiError>({
		queryKey: notificationsInfiniteListQueryKey,
		queryFn: ({ pageParam }) =>
			fetchNotifications(pageParam as FetchNotificationsParams),
		initialPageParam: {
			offset: 0,
			limit: NOTIFICATIONS_INITIAL_LIMIT,
		} as FetchNotificationsParams,
		getNextPageParam: (lastPage, allPages) => {
			const loaded = allPages.reduce(
				(sum, page) => sum + page.notifications.length,
				0,
			)
			if (loaded >= lastPage.total) return undefined
			return {
				offset: loaded,
				limit: NOTIFICATIONS_PAGE_LIMIT,
			} satisfies FetchNotificationsParams
		},
		enabled: isAuthenticated,
	})
	const unreadCountQuery = useQuery<number, ApiError>({
		queryKey: notificationsUnreadCountQueryKey,
		queryFn: fetchUnreadCount,
		enabled: isAuthenticated,
	})
	async function invalidateNotifications(): Promise<void> {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: notificationsInfiniteListQueryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: notificationsUnreadCountQueryKey,
			}),
		])
	}
	function handleNotificationStreamMessage(message: SseMessage): void {
		if (message.type !== "notification") return
		void invalidateNotifications()
	}
	useNotificationStream({
		enabled: isAuthenticated,
		onMessage: handleNotificationStreamMessage,
	})
	const markAsReadMutation = useMutation<
		MarkAsReadResponse["readAt"],
		ApiError,
		string,
		MarkAsReadContext
	>({
		mutationFn: markNotificationAsReadRequest,
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
			return applyOptimisticMarkAsRead(queryClient, notificationId)
		},
		onError: (_error, _notificationId, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData<InfiniteData<NotificationsResponse>>(
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
		},
		onSettled: invalidateNotifications,
	})
	const markAllAsReadMutation = useMutation<void, ApiError, void>({
		mutationFn: markAllNotificationsAsReadRequest,
		retry: 0,
		onSuccess: invalidateNotifications,
	})
	async function markAsRead(notificationId: string): Promise<void> {
		await markAsReadMutation.mutateAsync(notificationId)
	}
	async function markAllAsRead(): Promise<void> {
		await markAllAsReadMutation.mutateAsync()
	}
	return {
		notifications:
			notificationsQuery.data?.pages.flatMap((page) => page.notifications) ??
			[],
		total: notificationsQuery.data?.pages[0]?.total ?? 0,
		unreadCount: unreadCountQuery.data ?? 0,
		isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
		hasNextPage: notificationsQuery.hasNextPage ?? false,
		fetchNextPage: () => {
			void notificationsQuery.fetchNextPage()
		},
		isFetchingNextPage: notificationsQuery.isFetchingNextPage,
		markAsRead,
		markAllAsRead,
	}
}
```

Observação: `NOTIFICATIONS_DEFAULT_PAGE`/`page` continuam sendo enviados na query string por retrocompatibilidade com o schema Zod do backend (que ainda os exige por padrão), mas deixam de influenciar a paginação assim que `offset`/`limit` estão presentes (garantido pela task-01).

- **Step 4: Run test to verify it passes**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: PASS — todos os testes do arquivo (os pré-existentes adaptados ao novo formato de cache + os 4 novos) passam.

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/lib/notifications/use-notifications.ts \
  apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(notifications): migrar useNotifications para useInfiniteQuery"
```

## Critérios de Sucesso

- A carga inicial do dropdown busca no máximo 10 notificações (FR-003).
- Cada lote buscado após a carga inicial contém no máximo 5 notificações (FR-002).
- `hasNextPage` torna-se `false` e nenhuma busca adicional ocorre assim que todas as notificações do usuário foram carregadas (FR-004).
- Quando o total de notificações do usuário é menor ou igual a 10, nenhuma busca além da inicial é disparada (FR-005).
