"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { ApiError } from "@/lib/errors"
import { toApiError } from "./to-api-error"

export type MySubscription = NonNullable<
	paths["/subscriptions/me"]["get"]["responses"][200]["content"]["application/json"]
>

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
