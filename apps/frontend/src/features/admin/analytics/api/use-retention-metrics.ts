"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { ANALYTICS_STALE_TIME_MS } from "./use-check-in-metrics"

type RetentionMetricsResponse =
	paths["/admin/analytics/retention"]["get"]["responses"][200]["content"]["application/json"]

export const RETENTION_METRICS_QUERY_KEY = "admin-analytics-retention" as const

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function useRetentionMetrics(
	period: PeriodKey,
): UseQueryResult<RetentionMetricsResponse, ApiError> {
	return useQuery<RetentionMetricsResponse, ApiError>({
		queryKey: [RETENTION_METRICS_QUERY_KEY, period],
		queryFn: async () => {
			const { data, error } = await api.GET("/admin/analytics/retention", {
				params: { query: { period } },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		staleTime: ANALYTICS_STALE_TIME_MS,
	})
}
