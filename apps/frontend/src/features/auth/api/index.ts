"use client"

import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import type {
	ActivateInput,
	ChangePasswordInput,
	LoginInput,
	SignupInput,
} from "@/features/auth/schemas"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export interface LoginResult {
	token: string
	refreshToken: string
}

export function useLogin(): UseMutationResult<
	LoginResult,
	ApiError,
	LoginInput
> {
	return useMutation<LoginResult, ApiError, LoginInput>({
		mutationFn: async (input) => {
			const { data, error } = await api.POST("/sessions", {
				body: input,
			})
			if (error || !data) throw toApiError(error)
			useAuthStore.getState().setSession(data.token)
			return { token: data.token, refreshToken: data.refreshToken }
		},
	})
}

export interface LoginWithGoogleResult {
	token: string
	refreshToken: string
}

export function useLoginWithGoogle(): UseMutationResult<
	LoginWithGoogleResult,
	ApiError,
	string
> {
	return useMutation<LoginWithGoogleResult, ApiError, string>({
		mutationFn: async (idToken) => {
			const { data, error } = await api.POST("/sessions/google", {
				body: { idToken },
			})
			if (error || !data) throw toApiError(error)
			useAuthStore.getState().setSession(data.token)
			return { token: data.token, refreshToken: data.refreshToken }
		},
	})
}

export interface SignupResult {
	email: string
}

export function useSignup(): UseMutationResult<
	SignupResult,
	ApiError,
	SignupInput
> {
	return useMutation<SignupResult, ApiError, SignupInput>({
		mutationFn: async (input) => {
			const { data, error } = await api.POST("/users", {
				body: { ...input, role: "MEMBER" },
			})
			if (error || !data) throw toApiError(error)
			return { email: data.email }
		},
	})
}

export function useActivateAccount(): UseMutationResult<
	void,
	ApiError,
	ActivateInput
> {
	return useMutation<void, ApiError, ActivateInput>({
		mutationFn: async (input) => {
			const { error } = await api.PATCH("/users/activate", {
				body: input,
			})
			if (error) throw toApiError(error)
		},
	})
}

export function useLogout(): UseMutationResult<void, ApiError, void> {
	return useMutation<void, ApiError, void>({
		mutationFn: async () => {
			try {
				const { error } = await api.POST("/sessions/logout")
				if (error) throw toApiError(error)
			} finally {
				useAuthStore.getState().clear()
			}
		},
	})
}

export function useChangePassword(): UseMutationResult<
	void,
	ApiError,
	ChangePasswordInput
> {
	return useMutation<void, ApiError, ChangePasswordInput>({
		mutationFn: async (input) => {
			const { error } = await api.PATCH("/users/me/change-password", {
				body: { newRawPassword: input.newPassword },
			})
			if (error) throw toApiError(error)
		},
	})
}
