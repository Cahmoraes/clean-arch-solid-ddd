"use client"

import type { paths } from "@repo/api-types"
import {
	type InfiniteData,
	type QueryClient,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
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

/**
 * `fetchedCount` é o tamanho real de `notifications` retornado pela API nesta
 * página, congelado no momento da busca. A reconciliação de SSE (task-04)
 * prepend itens em `pages[0].notifications` sem tocar em `fetchedCount` — é
 * esse campo, não `notifications.length`, que `getNextPageParam` usa para
 * calcular o próximo `offset`, para um item inserido via SSE nunca desalinhar
 * a paginação por offset do backend.
 */
type NotificationsPage = NotificationsResponse & { fetchedCount: number }

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
	previousNotifications?: InfiniteData<NotificationsPage>
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
}: FetchNotificationsParams): Promise<NotificationsPage> {
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
	return { ...data, fetchedCount: data.notifications.length }
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
		params: {
			path: {
				id: notificationId,
			},
		},
	})
	if (error || !data) throw toApiError(error)
	return data.readAt
}

async function markAllNotificationsAsReadRequest(): Promise<void> {
	const { data, error } = await api.PATCH("/api/v1/notifications/read-all", {})
	if (error || !data) throw toApiError(error)
}

function markNotificationRead(
	notification: NotificationItem,
	notificationId: string,
	readAt: string,
): NotificationItem {
	if (notification.id !== notificationId) return notification
	if (notification.readAt) return notification
	return {
		...notification,
		readAt,
	}
}

function markNotificationAsReadLocally(
	data: InfiniteData<NotificationsPage>,
	notificationId: string,
	readAt: string,
): InfiniteData<NotificationsPage> {
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			notifications: page.notifications.map((notification) =>
				markNotificationRead(notification, notificationId, readAt),
			),
		})),
	}
}

function hasUnreadNotification(
	previousNotifications: InfiniteData<NotificationsPage> | undefined,
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
	return {
		previousNotifications,
		previousUnreadCount,
	}
}

export function useNotifications(): UseNotificationsResult {
	const queryClient = useQueryClient()
	const user = useAuthStore((state) => state.user)
	const isAuthenticated = user !== null
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
