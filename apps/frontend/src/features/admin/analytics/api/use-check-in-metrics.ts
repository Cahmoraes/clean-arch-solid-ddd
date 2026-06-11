"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { PeriodKey } from "../hooks/use-analytics-period"

type CheckInMetricsResponse =
	paths["/admin/analytics/checkins"]["get"]["responses"][200]["content"]["application/json"]

export const CHECK_IN_METRICS_QUERY_KEY = "admin-analytics-checkins" as const
export const ANALYTICS_STALE_TIME_MS = 60_000

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function useCheckInMetrics(
	period: PeriodKey,
): UseQueryResult<CheckInMetricsResponse, ApiError> {
	return useQuery<CheckInMetricsResponse, ApiError>({
		queryKey: [CHECK_IN_METRICS_QUERY_KEY, period],
		queryFn: async () => {
			const { data, error } = await api.GET("/admin/analytics/checkins", {
				params: { query: { period } },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		staleTime: ANALYTICS_STALE_TIME_MS,
	})
}
