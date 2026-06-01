"use client"

import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	type CheckInStats,
	getCheckInsExtendedClient,
} from "../api/extended-paths"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

async function fetchMyCheckInStats(): Promise<CheckInStats> {
	const client = getCheckInsExtendedClient()
	const { data, error } = await client.GET("/check-ins/me/stats", {})
	if (error || !data) throw toApiError(error)
	return data
}

export function useMyCheckInStats(): UseQueryResult<CheckInStats, ApiError> {
	return useQuery<CheckInStats, ApiError>({
		queryKey: ["my-check-in-stats"],
		queryFn: fetchMyCheckInStats,
		staleTime: 30_000,
	})
}
