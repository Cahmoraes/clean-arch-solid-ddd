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

export const CHANGE_PLAN_MUTATION_KEY = [
	"subscriptions",
	"change-plan",
] as const

export interface ChangePlanInput {
	priceId: string
}

const STALE_STATE_STATUSES: ReadonlyArray<number> = [404, 409]

/**
 * Mutation de `PATCH /subscriptions/me/plan`. Em 404/409 a tela está desatualizada
 * (assinatura inexistente ou cancelamento agendado): a consulta é invalidada para
 * recarregar o estado real.
 */
export function useChangePlan(): UseMutationResult<
	MySubscription,
	ApiError,
	ChangePlanInput
> {
	const queryClient = useQueryClient()
	return useMutation<MySubscription, ApiError, ChangePlanInput>({
		mutationKey: CHANGE_PLAN_MUTATION_KEY,
		retry: 0,
		mutationFn: async (input) => {
			const { data, error } = await api.PATCH("/subscriptions/me/plan", {
				body: input,
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: MY_SUBSCRIPTION_QUERY_KEY,
			})
		},
		onError: async (error) => {
			if (STALE_STATE_STATUSES.includes(error.status)) {
				await queryClient.invalidateQueries({
					queryKey: MY_SUBSCRIPTION_QUERY_KEY,
				})
			}
		},
	})
}
