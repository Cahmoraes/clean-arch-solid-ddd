"use client"

import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import type { CheckIn } from "@/features/check-ins/api"
import { getCheckInsExtendedClient } from "@/features/check-ins/api/extended-paths"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const dashboardKeys = {
	history: () => ["dashboard", "history"] as const,
}

const MAX_HISTORY_PAGES = 15
const PAGE_SIZE = 10 // backend default

async function fetchDashboardHistory(): Promise<CheckIn[]> {
	const client = getCheckInsExtendedClient()

	const { data: first, error } = await client.GET("/check-ins/me", {
		params: { query: { page: 1 } },
	})
	if (error || !first) throw toApiError(error)

	const totalPages = Math.min(
		Math.ceil(first.total / PAGE_SIZE),
		MAX_HISTORY_PAGES,
	)

	if (totalPages <= 1) return first.items

	const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)

	const remainingResults = await Promise.all(
		remainingPages.map((page) =>
			client
				.GET("/check-ins/me", { params: { query: { page } } })
				.then(({ data, error: e }) => {
					if (e || !data) throw toApiError(e)
					return data.items
				}),
		),
	)

	return [...first.items, ...remainingResults.flat()]
}

export function useDashboardHistory(): UseQueryResult<CheckIn[], ApiError> {
	return useQuery<CheckIn[], ApiError>({
		queryKey: dashboardKeys.history(),
		queryFn: fetchDashboardHistory,
		staleTime: 60_000,
	})
}
