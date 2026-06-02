"use client"

import type { paths } from "@repo/api-types"
import {
	keepPreviousData,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { UserFilter } from "../types"

type UsersResponse =
	paths["/users"]["get"]["responses"][200]["content"]["application/json"]

export type AdminUser = UsersResponse["users"][number]
export type AdminUsersPagination = UsersResponse["pagination"]

export interface UseUsersParams {
	page: number
	limit: number
	query?: string
	filter?: UserFilter
	enabled?: boolean
}

export interface UseUsersResult {
	users: ReadonlyArray<AdminUser>
	pagination: AdminUsersPagination
}

export const ADMIN_USERS_QUERY_KEY = "admin-users" as const
export const ADMIN_USERS_DEFAULT_LIMIT = 10
export const ADMIN_USERS_STALE_TIME_MS = 30_000

export function adminUsersQueryKey(params: UseUsersParams) {
	return [
		ADMIN_USERS_QUERY_KEY,
		params.page,
		params.limit,
		params.query ?? "",
		params.filter ?? "all",
	] as const
}

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

type FilterParams =
	| { role: "MEMBER" | "ADMIN" }
	| { status: "active" | "inactive" }
	| Record<string, never>

const FILTER_PARAMS_MAP: Record<UserFilter, FilterParams> = {
	all: {},
	member: { role: "MEMBER" },
	admin: { role: "ADMIN" },
	active: { status: "active" },
	inactive: { status: "inactive" },
}

function buildFilterParams(filter?: UserFilter): FilterParams {
	return FILTER_PARAMS_MAP[filter ?? "all"]
}

export function useUsers(
	params: UseUsersParams,
): UseQueryResult<UseUsersResult, ApiError> {
	const { enabled = true } = params
	return useQuery<UseUsersResult, ApiError>({
		queryKey: adminUsersQueryKey(params),
		enabled,
		queryFn: async () => {
			const filterParams = buildFilterParams(params.filter)
			const { data, error } = await api.GET("/users", {
				params: {
					query: {
						page: params.page,
						limit: params.limit,
						query: params.query,
						...filterParams,
					},
				},
			})
			if (error || !data) throw toApiError(error)
			return { users: data.users, pagination: data.pagination }
		},
		staleTime: ADMIN_USERS_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	})
}
