"use client"

import {
	keepPreviousData,
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import {
	type CheckInsListQuery,
	getCheckInsExtendedClient,
	type PaginatedCheckIns,
} from "./extended-paths"

export type { CheckIn, PaginatedCheckIns } from "./extended-paths"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const checkInsKeys = {
	all: ["check-ins"] as const,
	list: (query: CheckInsListQuery) =>
		[
			...checkInsKeys.all,
			"list",
			query.page ?? 1,
			query.status ?? "all",
		] as const,
	pendingAdmin: (page: number) =>
		[...checkInsKeys.all, "admin-pending", page] as const,
}

export const CHECK_INS_DEFAULT_PAGE_SIZE = 20

export interface CreateCheckInInput {
	gymId: string
	userLatitude: number
	userLongitude: number
}

export interface CreateCheckInResult {
	id: string
	date: string
}

async function createCheckInRequest(
	input: CreateCheckInInput,
): Promise<CreateCheckInResult> {
	const { data, error } = await api.POST("/check-ins", {
		body: {
			gymId: input.gymId,
			userLatitude: input.userLatitude,
			userLongitude: input.userLongitude,
		},
	})
	if (error || !data) throw toApiError(error)
	return { id: data.id, date: data.date }
}

/**
 * Mutation for creating a check-in. Disables retry to preserve idempotency
 * (RF-16). On success, invalidates all check-in queries so the user history
 * (and admin pending list) refresh automatically.
 */
export function useCreateCheckIn(): UseMutationResult<
	CreateCheckInResult,
	ApiError,
	CreateCheckInInput
> {
	const queryClient = useQueryClient()
	return useMutation<CreateCheckInResult, ApiError, CreateCheckInInput>({
		mutationFn: createCheckInRequest,
		retry: 0,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: checkInsKeys.all })
		},
	})
}

async function fetchCheckIns(
	query: CheckInsListQuery,
): Promise<PaginatedCheckIns> {
	const client = getCheckInsExtendedClient()
	const { data, error } = await client.GET("/check-ins", {
		params: { query },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export interface UseCheckInsParams {
	page: number
	status?: "pending" | "validated" | "rejected"
}

export function useCheckIns(
	params: UseCheckInsParams,
): UseQueryResult<PaginatedCheckIns, ApiError> {
	const query: CheckInsListQuery = {
		page: params.page,
		...(params.status ? { status: params.status } : {}),
	}
	return useQuery<PaginatedCheckIns, ApiError>({
		queryKey: checkInsKeys.list(query),
		queryFn: () => fetchCheckIns(query),
		placeholderData: keepPreviousData,
	})
}

async function validateCheckInRequest(checkInId: string): Promise<string> {
	const client = getCheckInsExtendedClient()
	const { data, error } = await client.PATCH("/check-ins/validate", {
		body: { checkInId },
	})
	if (error || !data) throw toApiError(error)
	return data.checkInId
}

/**
 * Admin mutation to confirm a pending check-in (RF-18). Invalidates all
 * check-ins queries so the pending list refreshes without a manual reload.
 */
export function useValidateCheckIn(): UseMutationResult<
	string,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<string, ApiError, string>({
		mutationFn: validateCheckInRequest,
		retry: 0,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: checkInsKeys.all })
		},
	})
}

async function rejectCheckInRequest(checkInId: string): Promise<string> {
	const client = getCheckInsExtendedClient()
	const { data, error } = await client.PATCH("/check-ins/reject", {
		body: { checkInId },
	})
	if (error || !data) throw toApiError(error)
	return data.rejectedAt
}

/**
 * Admin mutation to reject a pending or validated check-in. Invalidates all
 * check-in queries so the list refreshes automatically.
 */
export function useRejectCheckIn(): UseMutationResult<
	string,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<string, ApiError, string>({
		mutationFn: rejectCheckInRequest,
		retry: 0,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: checkInsKeys.all })
		},
	})
}
