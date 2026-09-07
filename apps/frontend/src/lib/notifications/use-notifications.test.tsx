import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useNotificationStream } from "./use-notification-stream"
import { useNotifications } from "./use-notifications"

const { mockGet, mockPatch, mockUseAuthStore } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPatch: vi.fn(),
	mockUseAuthStore: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
	api: {
		GET: mockGet,
		PATCH: mockPatch,
	},
}))

vi.mock("@/lib/auth/auth-store", () => ({
	useAuthStore: (selector: (state: unknown) => unknown) =>
		mockUseAuthStore(selector),
}))

vi.mock("./use-notification-stream", () => ({
	useNotificationStream: vi.fn(),
}))

const authenticatedUser = {
	id: "user-1",
	role: "MEMBER" as const,
}

let authState = {
	accessToken: "token",
	expiresAt: null,
	user: authenticatedUser,
	setSession: vi.fn(),
	clear: vi.fn(),
}

function createWrapper(): {
	queryClient: QueryClient
	wrapper: (props: { children: ReactNode }) => React.JSX.Element
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	return {
		queryClient,
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	}
}

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

function makePaginatedNotificationsResponse(
	offset: number,
	limit: number,
	total: number,
) {
	const items = Array.from(
		{ length: Math.max(0, Math.min(limit, total - offset)) },
		(_, i) =>
			makeNotificationItem(`notification-${offset + i + 1}`, offset + i + 1),
	)
	return { notifications: items, total }
}

function resolveNotificationsGet(
	options:
		| { params?: { query?: { offset?: number; limit?: number } } }
		| undefined,
	total: number,
) {
	const query = options?.params?.query
	const offset = query?.offset ?? 0
	const limit = query?.limit ?? 10
	return Promise.resolve({
		data: makePaginatedNotificationsResponse(offset, limit, total),
		error: undefined,
	})
}

function mockNotificationsRequests(total: number): void {
	mockGet.mockImplementation((path, options) => {
		if (path === "/api/v1/notifications") {
			return resolveNotificationsGet(options, total)
		}
		if (path === "/api/v1/notifications/unread-count") {
			return Promise.resolve({ data: { count: 1 }, error: undefined })
		}
		throw new Error(`Unexpected GET: ${String(path)}`)
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	authState = {
		accessToken: "token",
		expiresAt: null,
		user: authenticatedUser,
		setSession: vi.fn(),
		clear: vi.fn(),
	}
	mockUseAuthStore.mockImplementation((selector) => selector(authState))
	vi.mocked(useNotificationStream).mockImplementation(() => undefined)
	mockNotificationsRequests(25)
	mockPatch.mockImplementation((path) => {
		if (path === "/api/v1/notifications/{id}/read") {
			return Promise.resolve({
				data: { readAt: "2024-01-03T10:00:00Z" },
				error: undefined,
			})
		}
		if (path === "/api/v1/notifications/read-all") {
			return Promise.resolve({
				data: { markedCount: 1 },
				error: undefined,
			})
		}
		throw new Error(`Unexpected PATCH: ${String(path)}`)
	})
})

describe("useNotifications", () => {
	test("retorna lista vazia no carregamento inicial", () => {
		mockGet.mockImplementation(() => new Promise(() => {}))
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		expect(result.current.notifications).toEqual([])
		expect(result.current.total).toBe(0)
		expect(result.current.unreadCount).toBe(0)
		expect(result.current.isLoading).toBe(true)
	})

	test("retorna notificações da API", async () => {
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
		expect(result.current.notifications).toEqual(
			makePaginatedNotificationsResponse(0, 10, 25).notifications,
		)
		expect(result.current.unreadCount).toBe(1)
		expect(mockGet).toHaveBeenCalledWith(
			"/api/v1/notifications/unread-count",
			{},
		)
	})

	test("markAsRead chama PATCH /api/v1/notifications/{id}/read", async () => {
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			await result.current.markAsRead("notification-1")
		})
		expect(mockPatch).toHaveBeenCalledWith("/api/v1/notifications/{id}/read", {
			params: {
				path: {
					id: "notification-1",
				},
			},
		})
	})

	test("markAllAsRead chama PATCH /api/v1/notifications/read-all", async () => {
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			await result.current.markAllAsRead()
		})
		expect(mockPatch).toHaveBeenCalledWith("/api/v1/notifications/read-all", {})
	})

	test("invalida as queries ao receber evento notification via SSE", async () => {
		const { wrapper } = createWrapper()
		renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
		const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
		await act(async () => {
			streamOptions?.onMessage({
				type: "notification",
				payload: {
					notificationId: "notification-3",
					userId: "user-1",
					type: "PROMOTION",
					title: "Nova promoção",
					message: "Você recebeu uma nova promoção.",
				},
			})
		})
		await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(4))
	})

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
})
