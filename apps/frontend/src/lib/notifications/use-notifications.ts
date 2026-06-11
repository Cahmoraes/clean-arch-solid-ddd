"use client"

import type { paths } from "@repo/api-types"
import {
	type QueryClient,
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

export type NotificationItem = NotificationsResponse["notifications"][number]

export interface UseNotificationsResult {
	notifications: NotificationItem[]
	total: number
	unreadCount: number
	isLoading: boolean
	markAsRead: (notificationId: string) => Promise<void>
	markAllAsRead: () => Promise<void>
}

interface MarkAsReadContext {
	previousNotifications?: NotificationsResponse
	previousUnreadCount?: number
}

export const NOTIFICATIONS_QUERY_KEY = "notifications" as const
export const NOTIFICATIONS_DEFAULT_PAGE = 1
export const NOTIFICATIONS_DEFAULT_UNREAD_ONLY = false

export const notificationsKeys = {
	all: [NOTIFICATIONS_QUERY_KEY] as const,
	list: (page: number, unreadOnly: boolean) =>
		[...notificationsKeys.all, "list", page, unreadOnly] as const,
	unreadCount: () => [...notificationsKeys.all, "unread-count"] as const,
}

export const notificationsListQueryKey = notificationsKeys.list(
	NOTIFICATIONS_DEFAULT_PAGE,
	NOTIFICATIONS_DEFAULT_UNREAD_ONLY,
)
export const notificationsUnreadCountQueryKey = notificationsKeys.unreadCount()

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

async function fetchNotifications(): Promise<NotificationsResponse> {
	const { data, error } = await api.GET("/api/v1/notifications", {
		params: {
			query: {
				page: NOTIFICATIONS_DEFAULT_PAGE,
				unreadOnly: NOTIFICATIONS_DEFAULT_UNREAD_ONLY,
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

function markNotificationAsReadLocally(
	data: NotificationsResponse,
	notificationId: string,
	readAt: string,
): NotificationsResponse {
	return {
		...data,
		notifications: data.notifications.map((notification) => {
			if (notification.id !== notificationId) return notification
			if (notification.readAt) return notification
			return {
				...notification,
				readAt,
			}
		}),
	}
}

function hasUnreadNotification(
	previousNotifications: NotificationsResponse | undefined,
	notificationId: string,
): boolean {
	return (
		previousNotifications?.notifications.some(
			(notification) =>
				notification.id === notificationId && notification.readAt === null,
		) ?? false
	)
}

function applyOptimisticMarkAsRead(
	queryClient: QueryClient,
	notificationId: string,
): MarkAsReadContext {
	const previousNotifications = queryClient.getQueryData<NotificationsResponse>(
		notificationsListQueryKey,
	)
	const previousUnreadCount = queryClient.getQueryData<number>(
		notificationsUnreadCountQueryKey,
	)
	const shouldDecreaseUnreadCount = hasUnreadNotification(
		previousNotifications,
		notificationId,
	)
	if (previousNotifications) {
		queryClient.setQueryData<NotificationsResponse>(
			notificationsListQueryKey,
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
	const notificationsQuery = useQuery<NotificationsResponse, ApiError>({
		queryKey: notificationsListQueryKey,
		queryFn: fetchNotifications,
		enabled: isAuthenticated,
	})
	const unreadCountQuery = useQuery<number, ApiError>({
		queryKey: notificationsUnreadCountQueryKey,
		queryFn: fetchUnreadCount,
		enabled: isAuthenticated,
	})
	async function invalidateNotifications(): Promise<void> {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: notificationsListQueryKey }),
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
				queryClient.cancelQueries({ queryKey: notificationsListQueryKey }),
				queryClient.cancelQueries({
					queryKey: notificationsUnreadCountQueryKey,
				}),
			])
			return applyOptimisticMarkAsRead(queryClient, notificationId)
		},
		onError: (_error, _notificationId, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData<NotificationsResponse>(
					notificationsListQueryKey,
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
		notifications: notificationsQuery.data?.notifications ?? [],
		total: notificationsQuery.data?.total ?? 0,
		unreadCount: unreadCountQuery.data ?? 0,
		isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
		markAsRead,
		markAllAsRead,
	}
}
