"use client"

import type { paths } from "@repo/api-types"
import type { UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

type UserStatsResponse =
	paths["/users/stats"]["get"]["responses"][200]["content"]["application/json"]

export const USER_STATS_QUERY_KEY = "user-stats" as const
export const USER_STATS_STALE_TIME_MS = 30_000

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function useUserStats(): UseQueryResult<UserStatsResponse, ApiError> {
	return useQuery<UserStatsResponse, ApiError>({
		queryKey: [USER_STATS_QUERY_KEY],
		queryFn: async () => {
			const { data, error } = await api.GET("/users/stats")
			if (error || !data) throw toApiError(error)
			return data
		},
		staleTime: USER_STATS_STALE_TIME_MS,
	})
}
