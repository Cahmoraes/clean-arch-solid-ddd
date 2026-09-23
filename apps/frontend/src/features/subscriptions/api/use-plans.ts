"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type Plan =
	paths["/plans"]["get"]["responses"][200]["content"]["application/json"][number]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const PLANS_QUERY_KEY = ["plans"] as const

async function fetchPlans(): Promise<Plan[]> {
	const { data, error } = await api.GET("/plans")
	if (error || !data) throw toApiError(error)
	return data
}

export function usePlans(): UseQueryResult<Plan[], ApiError> {
	return useQuery<Plan[], ApiError>({
		queryKey: PLANS_QUERY_KEY,
		queryFn: fetchPlans,
	})
}
