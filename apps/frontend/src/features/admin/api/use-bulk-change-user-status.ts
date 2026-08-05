"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
import { ADMIN_USERS_QUERY_KEY } from "./use-users"

export type BulkStatusAction = "activate" | "deactivate"

export interface BulkChangeUserStatusInput {
	userIds: string[]
	action: BulkStatusAction
}

export interface BulkChangeUserStatusResult {
	updated: number
	requested: number
	skipped: number
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

function resolvePath(
	action: BulkStatusAction,
): "/users/bulk-activate" | "/users/bulk-deactivate" {
	return action === "activate"
		? "/users/bulk-activate"
		: "/users/bulk-deactivate"
}

function buildSuccessMessage(
	result: BulkChangeUserStatusResult,
	action: BulkStatusAction,
): string {
	const verb = action === "activate" ? "ativado(s)" : "desativado(s)"
	const base = `${result.updated} usuário(s) ${verb} com sucesso.`
	if (result.skipped > 0) {
		return `${base} ${result.skipped} usuário(s) ignorado(s).`
	}
	return base
}

export function useBulkChangeUserStatus(): UseMutationResult<
	BulkChangeUserStatusResult,
	ApiError,
	BulkChangeUserStatusInput
> {
	const queryClient = useQueryClient()

	return useMutation<
		BulkChangeUserStatusResult,
		ApiError,
		BulkChangeUserStatusInput
	>({
		mutationFn: async ({ userIds, action }) => {
			const { data, error } = await api.PATCH(resolvePath(action), {
				body: { userIds },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: (result, variables) => {
			toast.success(buildSuccessMessage(result, variables.action))
		},
		onError: (error) => {
			toast.error(error.userMessage)
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
			void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
		},
	})
}
