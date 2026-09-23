"use client"

import type { paths } from "@repo/api-types"
import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { PlanAdminInput } from "@/features/plans-admin/schemas/plan-admin-schema"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type PlanAdmin =
	paths["/admin/plans"]["get"]["responses"][200]["content"]["application/json"][number]

type CreatePlanBody =
	paths["/admin/plans"]["post"]["requestBody"]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const plansAdminKeys = {
	all: ["plans-admin"] as const,
	list: () => [...plansAdminKeys.all, "list"] as const,
}

function toPriceCents(price: number): number {
	return Math.round(price * 100)
}

function buildPlanBody(input: PlanAdminInput): CreatePlanBody {
	return {
		name: input.name,
		priceCents: toPriceCents(input.price),
		billingPeriod: input.billingPeriod,
		tagline: input.tagline,
		features: input.features,
		...(input.stripePriceId ? { stripePriceId: input.stripePriceId } : {}),
	}
}

async function fetchPlansAdmin(): Promise<PlanAdmin[]> {
	const { data, error } = await api.GET("/admin/plans")
	if (error || !data) throw toApiError(error)
	return data
}

export function usePlans(): UseQueryResult<PlanAdmin[], ApiError> {
	return useQuery<PlanAdmin[], ApiError>({
		queryKey: plansAdminKeys.list(),
		queryFn: fetchPlansAdmin,
	})
}

async function createPlanRequest(input: PlanAdminInput): Promise<PlanAdmin> {
	const { data, error } = await api.POST("/admin/plans", {
		body: buildPlanBody(input),
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useCreatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	PlanAdminInput
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, PlanAdminInput>({
		mutationFn: createPlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

export interface UpdatePlanVariables {
	id: string
	input: PlanAdminInput
}

async function updatePlanRequest({
	id,
	input,
}: UpdatePlanVariables): Promise<PlanAdmin> {
	const { data, error } = await api.PUT("/admin/plans/{id}", {
		params: { path: { id } },
		body: buildPlanBody(input),
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useUpdatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	UpdatePlanVariables
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, UpdatePlanVariables>({
		mutationFn: updatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

async function inactivatePlanRequest(id: string): Promise<PlanAdmin> {
	const { data, error } = await api.PATCH("/admin/plans/{id}/inactivate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useInactivatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, string>({
		mutationFn: inactivatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}

async function reactivatePlanRequest(id: string): Promise<PlanAdmin> {
	const { data, error } = await api.PATCH("/admin/plans/{id}/reactivate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useReactivatePlan(): UseMutationResult<
	PlanAdmin,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<PlanAdmin, ApiError, string>({
		mutationFn: reactivatePlanRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: plansAdminKeys.all })
		},
	})
}
