"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type MySubscription = NonNullable<
	paths["/subscriptions/me"]["get"]["responses"][200]["content"]["application/json"]
>

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const MY_SUBSCRIPTION_QUERY_KEY = ["subscriptions", "me"] as const

async function fetchMySubscription(): Promise<MySubscription | null> {
	const { data, error } = await api.GET("/subscriptions/me")
	if (error) throw toApiError(error)
	return data ?? null
}

/**
 * Consulta a assinatura vigente. `null` (200) significa "sem assinatura" e é um
 * resultado normal da tela, não um erro.
 */
export function useMySubscription(): UseQueryResult<
	MySubscription | null,
	ApiError
> {
	return useQuery<MySubscription | null, ApiError>({
		queryKey: MY_SUBSCRIPTION_QUERY_KEY,
		queryFn: fetchMySubscription,
	})
}
