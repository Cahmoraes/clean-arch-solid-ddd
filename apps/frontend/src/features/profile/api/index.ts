"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type Me =
	paths["/users/me"]["get"]["responses"][200]["content"]["application/json"]

export type Metrics =
	paths["/users/me/metrics"]["get"]["responses"][200]["content"]["application/json"]

export type PublicUser =
	paths["/users/{userId}"]["get"]["responses"][200]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const profileQueryKeys = {
	me: () => ["profile", "me"] as const,
	metrics: () => ["profile", "metrics"] as const,
	user: (userId: string) => ["profile", "user", userId] as const,
}

export function useMe(): UseQueryResult<Me, ApiError> {
	return useQuery<Me, ApiError>({
		queryKey: profileQueryKeys.me(),
		queryFn: async () => {
			const { data, error } = await api.GET("/users/me")
			if (error || !data) throw toApiError(error)
			return data
		},
	})
}

export function useMetrics(): UseQueryResult<Metrics, ApiError> {
	return useQuery<Metrics, ApiError>({
		queryKey: profileQueryKeys.metrics(),
		queryFn: async () => {
			const { data, error } = await api.GET("/users/me/metrics")
			if (error || !data) throw toApiError(error)
			return data
		},
	})
}

export function useUserById(
	userId: string | undefined,
): UseQueryResult<PublicUser, ApiError> {
	return useQuery<PublicUser, ApiError>({
		queryKey: profileQueryKeys.user(userId ?? ""),
		enabled: Boolean(userId),
		queryFn: async () => {
			if (!userId) {
				throw new ApiError(400, "missing_user_id", mapStatusToMessage(400))
			}
			const { data, error } = await api.GET("/users/{userId}", {
				params: { path: { userId } },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
	})
}
