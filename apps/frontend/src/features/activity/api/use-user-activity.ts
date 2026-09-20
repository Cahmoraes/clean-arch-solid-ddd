"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import {
	type ActivityPageSize,
	DEFAULT_ACTIVITY_PAGE_SIZE,
} from "@/features/activity/lib/activity-pagination"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type UserActivityResponse =
	paths["/users/me/activity"]["get"]["responses"][200]["content"]["application/json"]

export type UserActivityEvent = UserActivityResponse["events"][number]
export type UserActivityEventType = UserActivityEvent["type"]
export type UserActivityPagination = UserActivityResponse["pagination"]

export interface UserActivityQueryData {
	events: UserActivityEvent[]
	pagination?: UserActivityPagination
}

export const USER_ACTIVITY_QUERY_KEY = "user-activity" as const

export function userActivityQueryKey(
	userId: string | undefined,
	page = 1,
	pageSize: ActivityPageSize = DEFAULT_ACTIVITY_PAGE_SIZE,
) {
	return userId
		? ([USER_ACTIVITY_QUERY_KEY, "admin", userId, page] as const)
		: ([USER_ACTIVITY_QUERY_KEY, "me", page, pageSize] as const)
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

async function fetchAdminActivity(
	userId: string,
	page: number,
): Promise<UserActivityQueryData> {
	const { data, error } = await api.GET("/users/{userId}/activity", {
		params: { path: { userId }, query: { page } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

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
	return userId
		? fetchAdminActivity(userId, page)
		: fetchMyActivity(page, pageSize)
}

function isOutOfRangePagination(
	pagination: UserActivityPagination | undefined,
): boolean {
	if (!pagination || pagination.total <= 0 || pagination.totalPages <= 0) {
		return false
	}
	return pagination.page < 1 || pagination.page > pagination.totalPages
}

function preserveMyActivityPlaceholder(
	previousData: UserActivityQueryData | undefined,
	previousQueryKey: readonly unknown[] | undefined,
	currentPageSize: ActivityPageSize,
): UserActivityQueryData | undefined {
	if (previousQueryKey?.[1] !== "me") return undefined
	const previousPageSize = previousQueryKey?.[3]
	if (previousPageSize !== undefined && previousPageSize !== currentPageSize) {
		return undefined
	}
	if (isOutOfRangePagination(previousData?.pagination)) return undefined
	return previousData
}

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
