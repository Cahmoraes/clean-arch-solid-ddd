"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { NoticeInput } from "../schemas/notice-schema"

export interface BroadcastNoticeResult {
	recipients: number
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

async function broadcastNoticeRequest(
	input: NoticeInput,
): Promise<BroadcastNoticeResult> {
	const { data, error } = await api.POST("/api/v1/notifications/broadcast", {
		body: input,
	})
	if (error || !data) throw toApiError(error)
	return { recipients: data.recipients }
}

export function useBroadcastNotice(): UseMutationResult<
	BroadcastNoticeResult,
	ApiError,
	NoticeInput
> {
	return useMutation<BroadcastNoticeResult, ApiError, NoticeInput>({
		mutationFn: broadcastNoticeRequest,
	})
}
