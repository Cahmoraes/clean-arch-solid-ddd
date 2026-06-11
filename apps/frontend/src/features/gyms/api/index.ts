"use client"

import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import type { CreateGymInput } from "@/features/gyms/schemas/create-gym-schema"
import { API_BASE_URL, api } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
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
	enabled?: boolean
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
		address: input.location.address,
		latitude: input.location.latitude,
		longitude: input.location.longitude,
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
	enabled = true,
}: GymsByNameParams): UseQueryResult<Gym[], ApiError> {
	const trimmed = name.trim()
	return useQuery<Gym[], ApiError>({
		queryKey: gymsKeys.search(trimmed, page),
		enabled: enabled && trimmed.length > 0,
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

export interface UpdateGymVariables {
	id: string
	input: CreateGymInput
}

async function updateGymRequest({
	id,
	input,
}: UpdateGymVariables): Promise<CreateGymResult> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.PUT("/gyms/{id}", {
		params: { path: { id } },
		body: buildCreateGymBody(input),
	})
	if (error || !data) throw toApiError(error)
	return { id: data.id }
}

export function useUpdateGym(): UseMutationResult<
	CreateGymResult,
	ApiError,
	UpdateGymVariables
> {
	const queryClient = useQueryClient()
	return useMutation<CreateGymResult, ApiError, UpdateGymVariables>({
		mutationFn: updateGymRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}

export interface SetGymImageVariables {
	id: string
	file: Blob
}

export interface SetGymImageResult {
	imageKey: string
	url: string
}

async function setGymImageRequest({
	id,
	file,
}: SetGymImageVariables): Promise<SetGymImageResult> {
	const form = new FormData()
	form.append("image", file, "gym-image.webp")
	const token = useAuthStore.getState().accessToken
	const response = await fetch(`${API_BASE_URL}/gyms/${id}/image`, {
		method: "POST",
		body: form,
		credentials: "include",
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	})
	if (!response.ok) {
		throw ApiError.fromStatus(response.status, "image_upload_failed")
	}
	return (await response.json()) as SetGymImageResult
}

export function useSetGymImage(): UseMutationResult<
	SetGymImageResult,
	ApiError,
	SetGymImageVariables
> {
	const queryClient = useQueryClient()
	return useMutation<SetGymImageResult, ApiError, SetGymImageVariables>({
		mutationFn: setGymImageRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}
