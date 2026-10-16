"use client"

import type { paths } from "@repo/api-types"
import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { mesBounds } from "../lib/mes-bounds"

export type TrainingNoteDTO =
	paths["/training-notes"]["get"]["responses"][200]["content"]["application/json"][number]

export type NotaCriada =
	paths["/training-notes"]["post"]["responses"][201]["content"]["application/json"]

export type NotaAtualizada =
	paths["/training-notes/{date}"]["put"]["responses"][200]["content"]["application/json"]

export interface UpsertNoteInput {
	data: string
	texto: string
}

export interface DeleteNoteInput {
	data: string
}

export const NOTA_JA_EXISTE_CODE = "NOTA_JA_EXISTE"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) {
		if (error.status === 409 && error.code !== NOTA_JA_EXISTE_CODE) {
			return new ApiError(
				error.status,
				NOTA_JA_EXISTE_CODE,
				error.userMessage,
				error.details,
			)
		}
		return error
	}
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export function trainingNotesQueryKey(
	year: number,
	month: number,
): readonly ["training-notes", number, number] {
	return ["training-notes", year, month] as const
}

async function fetchTrainingNotes(
	year: number,
	month: number,
): Promise<TrainingNoteDTO[]> {
	const { de, ate } = mesBounds(year, month)
	try {
		const { data, error } = await api.GET("/training-notes", {
			params: { query: { de, ate } },
		})
		if (error) throw toApiError(error)
		return data ?? []
	} catch (error) {
		throw toApiError(error)
	}
}

/**
 * Lista mensal das notas do usuário autenticado. A chave carrega ano e mês
 * para acompanhar a navegação do calendário.
 */
export function useTrainingNotesQuery(
	year: number,
	month: number,
): UseQueryResult<TrainingNoteDTO[], ApiError> {
	return useQuery<TrainingNoteDTO[], ApiError>({
		queryKey: trainingNotesQueryKey(year, month),
		queryFn: () => fetchTrainingNotes(year, month),
	})
}

async function createNoteRequest(input: UpsertNoteInput): Promise<NotaCriada> {
	try {
		const { data, error } = await api.POST("/training-notes", {
			body: input,
		})
		if (error) throw toApiError(error)
		if (!data) throw toApiError(new Error("Resposta vazia ao criar nota"))
		return data
	} catch (error) {
		throw toApiError(error)
	}
}

/**
 * Cria a nota do dia. O 409 (dia já tem nota) chega à UI com
 * `code: "NOTA_JA_EXISTE"` para trocar ao modo edição em vez de erro genérico.
 */
export function useCreateNote(): UseMutationResult<
	NotaCriada,
	ApiError,
	UpsertNoteInput
> {
	const queryClient = useQueryClient()
	return useMutation<NotaCriada, ApiError, UpsertNoteInput>({
		mutationFn: createNoteRequest,
		retry: 0,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["training-notes"],
			})
		},
	})
}

async function updateNoteRequest(
	input: UpsertNoteInput,
): Promise<NotaAtualizada> {
	try {
		const { data, error } = await api.PUT("/training-notes/{date}", {
			params: { path: { date: input.data } },
			body: { texto: input.texto },
		})
		if (error) throw toApiError(error)
		if (!data) throw toApiError(new Error("Resposta vazia ao atualizar nota"))
		return data
	} catch (error) {
		throw toApiError(error)
	}
}

export function useUpdateNote(): UseMutationResult<
	NotaAtualizada,
	ApiError,
	UpsertNoteInput
> {
	const queryClient = useQueryClient()
	return useMutation<NotaAtualizada, ApiError, UpsertNoteInput>({
		mutationFn: updateNoteRequest,
		retry: 0,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["training-notes"],
			})
		},
	})
}

async function deleteNoteRequest(input: DeleteNoteInput): Promise<void> {
	try {
		const { error } = await api.DELETE("/training-notes/{date}", {
			params: { path: { date: input.data } },
		})
		if (error) throw toApiError(error)
	} catch (error) {
		throw toApiError(error)
	}
}

export function useDeleteNote(): UseMutationResult<
	void,
	ApiError,
	DeleteNoteInput
> {
	const queryClient = useQueryClient()
	return useMutation<void, ApiError, DeleteNoteInput>({
		mutationFn: deleteNoteRequest,
		retry: 0,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["training-notes"],
			})
		},
	})
}
