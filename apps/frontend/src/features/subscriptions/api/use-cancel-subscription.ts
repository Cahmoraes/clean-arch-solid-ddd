"use client"

import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	MY_SUBSCRIPTION_QUERY_KEY,
	type MySubscription,
} from "./use-my-subscription"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const CANCEL_SUBSCRIPTION_MUTATION_KEY = [
	"subscriptions",
	"cancel",
] as const

/**
 * Mutation de `POST /subscriptions/me/cancel` (cancelamento ao fim do período,
 * idempotente). Em 404 a tela está desatualizada e a consulta é recarregada.
 */
export function useCancelSubscription(): UseMutationResult<
	MySubscription,
	ApiError,
	void
> {
	const queryClient = useQueryClient()
	return useMutation<MySubscription, ApiError, void>({
		mutationKey: CANCEL_SUBSCRIPTION_MUTATION_KEY,
		retry: 0,
		mutationFn: async () => {
			const { data, error } = await api.POST("/subscriptions/me/cancel")
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: MY_SUBSCRIPTION_QUERY_KEY,
			})
		},
		onError: async (error) => {
			if (error.status === 404) {
				await queryClient.invalidateQueries({
					queryKey: MY_SUBSCRIPTION_QUERY_KEY,
				})
			}
		},
	})
}
