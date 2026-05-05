"use client"

import type { QueryKey, UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { ADMIN_USERS_QUERY_KEY, type UseUsersResult } from "./use-users"

type Context = [QueryKey, UseUsersResult | undefined][]

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

export function useActivateUser(): UseMutationResult<void, ApiError, string> {
	const queryClient = useQueryClient()

	return useMutation<void, ApiError, string, Context>({
		mutationFn: async (userId: string) => {
			const { error } = await api.PATCH("/users/activate", {
				body: { userId },
			})
			if (error) throw toApiError(error)
		},
		onMutate: async (userId) => {
			await queryClient.cancelQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })

			const previousQueries = queryClient.getQueriesData<UseUsersResult>({
				queryKey: [ADMIN_USERS_QUERY_KEY],
			})

			queryClient.setQueriesData<UseUsersResult>(
				{ queryKey: [ADMIN_USERS_QUERY_KEY] },
				(old) => {
					if (!old) return old
					return {
						...old,
						users: old.users.map((user) =>
							user.id === userId
								? { ...user, status: "activated" as const }
								: user,
						),
					}
				},
			)

			return previousQueries
		},
		onError: (_error, _userId, context) => {
			if (!context) return
			for (const [queryKey, data] of context) {
				queryClient.setQueryData(queryKey, data)
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
		},
	})
}
