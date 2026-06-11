"use client"

import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import {
	type CreateSubscriptionInput,
	type CreateSubscriptionResponse,
	createSubscriptionResponseSchema,
} from "@/features/subscriptions/schemas"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const SUBSCRIPTIONS_MUTATION_KEY = ["subscriptions", "create"] as const

/**
 * Mutation que dispara `POST /subscriptions` (fluxo demonstrativo, sem cobrança real).
 * `retry: 0` garante que falhas não disparem novas cobranças simuladas.
 */
export function useCreateSubscription(): UseMutationResult<
	CreateSubscriptionResponse,
	ApiError,
	CreateSubscriptionInput
> {
	return useMutation<
		CreateSubscriptionResponse,
		ApiError,
		CreateSubscriptionInput
	>({
		mutationKey: SUBSCRIPTIONS_MUTATION_KEY,
		retry: 0,
		mutationFn: async (input) => {
			const { data, error } = await api.POST("/subscriptions", {
				body: input,
			})
			if (error || !data) throw toApiError(error)
			const parsed = createSubscriptionResponseSchema.safeParse(data)
			if (!parsed.success) {
				throw new ApiError(
					502,
					"invalid_response",
					"Resposta inesperada do servidor de assinaturas.",
					parsed.error.flatten(),
				)
			}
			return parsed.data
		},
	})
}
