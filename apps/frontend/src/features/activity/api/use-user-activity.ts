"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type UserActivityResponse =
	paths["/users/{userId}/activity"]["get"]["responses"][200]["content"]["application/json"]

export type UserActivityEvent = UserActivityResponse["events"][number]

export const USER_ACTIVITY_QUERY_KEY = "user-activity" as const

export function userActivityQueryKey(userId: string | undefined) {
	return [USER_ACTIVITY_QUERY_KEY, userId ?? "me"] as const
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export interface UseUserActivityOptions {
	enabled?: boolean
}

export function useUserActivity(
	userId?: string,
	options: UseUserActivityOptions = {},
): UseQueryResult<UserActivityEvent[], ApiError> {
	return useQuery<UserActivityEvent[], ApiError>({
		queryKey: userActivityQueryKey(userId),
		enabled: options.enabled ?? true,
		queryFn: async () => {
			const { data, error } = userId
				? await api.GET("/users/{userId}/activity", {
						params: { path: { userId } },
					})
				: await api.GET("/users/me/activity")
			if (error || !data) throw toApiError(error)
			return data.events
		},
	})
}
