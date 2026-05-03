"use client"

import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { CreateGymInput } from "@/features/gyms/schemas/create-gym-schema"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { type GymSummary, getGymsExtendedClient } from "./extended-paths"

export type Gym = GymSummary

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export interface GymsByNameParams {
	name: string
	page: number
}

export const gymsKeys = {
	all: ["gyms"] as const,
	list: (page: number) => [...gymsKeys.all, "list", page] as const,
	search: (name: string, page: number) =>
		[...gymsKeys.all, "search", name.toLowerCase(), page] as const,
	detail: (id: string) => [...gymsKeys.all, "detail", id] as const,
}

export interface CreateGymResult {
	id: string
}

function isNotFoundError(err: unknown): boolean {
	return err instanceof ApiError && err.status === 404
}

async function searchGymsByName(name: string, page: number): Promise<Gym[]> {
	try {
		const { data, error } = await api.GET("/gyms/search/{name}", {
			params: { path: { name }, query: { page } },
		})
		if (error || !data) throw toApiError(error)
		return data as Gym[]
	} catch (err) {
		if (isNotFoundError(err)) return []
		throw toApiError(err)
	}
}

async function fetchGymById(id: string): Promise<Gym> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.GET("/gyms/{id}", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

function buildCreateGymBody(input: CreateGymInput) {
	return {
		title: input.title,
		cnpj: input.cnpj,
		latitude: input.latitude,
		longitude: input.longitude,
		...(input.description ? { description: input.description } : {}),
		...(input.phone ? { phone: input.phone } : {}),
	}
}

async function createGymRequest(
	input: CreateGymInput,
): Promise<CreateGymResult> {
	const { data, error } = await api.POST("/gyms", {
		body: buildCreateGymBody(input),
	})
	if (error || !data) throw toApiError(error)
	return { id: data.id }
}

/**
 * Search gyms by name with pagination. When `name` is empty, the query is
 * disabled (caller should show a "type to search" empty state).
 */
export function useGymsByName({
	name,
	page,
}: GymsByNameParams): UseQueryResult<Gym[], ApiError> {
	const trimmed = name.trim()
	return useQuery<Gym[], ApiError>({
		queryKey: gymsKeys.search(trimmed, page),
		enabled: trimmed.length > 0,
		queryFn: () => searchGymsByName(trimmed, page),
	})
}

async function fetchAllGyms(page: number): Promise<Gym[]> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.GET("/gyms", {
		params: { query: { page } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export interface AllGymsParams {
	page: number
	enabled?: boolean
}

/** List all gyms with pagination. Pass `enabled: false` to suspend fetching. */
export function useAllGyms({
	page,
	enabled = true,
}: AllGymsParams): UseQueryResult<Gym[], ApiError> {
	return useQuery<Gym[], ApiError>({
		queryKey: gymsKeys.list(page),
		enabled,
		queryFn: () => fetchAllGyms(page),
	})
}

export function useGymById(
	id: string | undefined,
): UseQueryResult<Gym, ApiError> {
	return useQuery<Gym, ApiError>({
		queryKey: gymsKeys.detail(id ?? ""),
		enabled: Boolean(id),
		queryFn: () => fetchGymById(id ?? ""),
	})
}

export function useCreateGym(): UseMutationResult<
	CreateGymResult,
	ApiError,
	CreateGymInput
> {
	const queryClient = useQueryClient()
	return useMutation<CreateGymResult, ApiError, CreateGymInput>({
		mutationFn: createGymRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}
