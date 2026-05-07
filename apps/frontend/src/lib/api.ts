import type { paths } from "@repo/api-types"
import type { Middleware } from "openapi-fetch"
import createClient, { type Client } from "openapi-fetch"
import { toast } from "sonner"
import { createAuthFetchMiddleware } from "@/lib/auth/auth-fetch-middleware"
import { useAuthStore } from "@/lib/auth/auth-store"
import {
	getTokenRefreshScheduler,
	type RefreshResult,
} from "@/lib/auth/token-refresh"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@/lib/query-client"

export type ApiClient = Client<paths>

export const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const errorNormalizationMiddleware: Middleware = {
	async onResponse({ response }) {
		if (response.ok) return undefined
		const cloned = response.clone()
		let details: unknown
		let code = "api_error"
		try {
			const body = (await cloned.json()) as {
				code?: string
				message?: string
			}
			details = body
			if (body && typeof body.code === "string") {
				code = body.code
			}
		} catch {
			details = undefined
		}
		throw new ApiError(
			response.status,
			code,
			mapStatusToMessage(response.status),
			details,
		)
	},
}

export async function refreshAccessToken(): Promise<RefreshResult> {
	const response = await fetch(`${API_BASE_URL}/sessions/refresh`, {
		method: "PATCH",
		credentials: "include",
		signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
	})
	if (!response.ok) {
		throw ApiError.fromStatus(response.status, "refresh_failed")
	}
	const body = (await response.json()) as {
		token?: string
		accessToken?: string
		message?: string
	}
	const token = body.token ?? body.accessToken ?? body.message
	if (!token || typeof token !== "string") {
		throw new ApiError(500, "refresh_failed", mapStatusToMessage(500))
	}
	return { accessToken: token }
}

function handleForcedLogout(): void {
	useAuthStore.getState().clear("forced-logout")
	if (typeof window === "undefined") return
	if (window.location.pathname !== "/login") {
		toast.error("Sua sessão expirou. Faça login novamente.")
		window.location.href = "/login"
	}
}

export function createApiClient(): ApiClient {
	const client = createClient<paths>({
		baseUrl: API_BASE_URL,
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	})
	const scheduler = getTokenRefreshScheduler({
		refreshFn: refreshAccessToken,
		onForcedLogout: handleForcedLogout,
	})
	client.use(
		errorNormalizationMiddleware,
		createAuthFetchMiddleware({
			scheduler,
			onForcedLogout: handleForcedLogout,
		}),
	)
	return client
}

let apiSingleton: ApiClient | null = null

export function getApi(): ApiClient {
	if (!apiSingleton) {
		apiSingleton = createApiClient()
	}
	return apiSingleton
}

export const api: ApiClient = new Proxy({} as ApiClient, {
	get(_target, prop) {
		const client = getApi() as unknown as Record<PropertyKey, unknown>
		return client[prop as string]
	},
})
