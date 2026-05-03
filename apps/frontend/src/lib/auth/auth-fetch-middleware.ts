import type { Middleware } from "openapi-fetch"
import { useAuthStore } from "./auth-store"
import {
	getTokenRefreshScheduler,
	type TokenRefreshScheduler,
} from "./token-refresh"

const AUTH_FREE_OPERATIONS = new Set([
	"POST:/sessions",
	"PATCH:/sessions/refresh",
	"POST:/users",
])

function shouldAttachToken(request: Request): boolean {
	const url = new URL(request.url)
	const key = `${request.method.toUpperCase()}:${url.pathname}`
	return !AUTH_FREE_OPERATIONS.has(key)
}

function safeClone(request: Request): Request | null {
	try {
		return request.clone()
	} catch {
		return null
	}
}

function attachToken(request: Request): Request {
	const token = useAuthStore.getState().accessToken
	if (token) request.headers.set("Authorization", `Bearer ${token}`)
	return request
}

async function replayWithFreshToken(
	original: Request,
	token: string,
): Promise<Response> {
	const replay = new Request(original, {
		headers: new Headers(original.headers),
	})
	replay.headers.set("Authorization", `Bearer ${token}`)
	return fetch(replay)
}

export interface AuthMiddlewareOptions {
	scheduler?: TokenRefreshScheduler
	onForcedLogout?: () => void
}

export function createAuthFetchMiddleware(
	options: AuthMiddlewareOptions = {},
): Middleware {
	const requestClones = new Map<string, Request>()
	const getScheduler = (): TokenRefreshScheduler =>
		options.scheduler ?? getTokenRefreshScheduler()

	const tryRefresh = async (): Promise<boolean> => {
		try {
			await getScheduler().refreshNow()
			return true
		} catch {
			options.onForcedLogout?.()
			return false
		}
	}

	const handleReplay = async (
		original: Request,
		fallback: Response,
	): Promise<Response> => {
		const newToken = useAuthStore.getState().accessToken
		if (!newToken) return fallback
		const replayed = await replayWithFreshToken(original, newToken)
		if (replayed.status === 401) {
			useAuthStore.getState().clear("forced-logout")
			options.onForcedLogout?.()
		}
		return replayed
	}

	const handleUnauthorized = async (
		original: Request | undefined,
		fallback: Response,
	): Promise<Response> => {
		const refreshed = await tryRefresh()
		if (!refreshed || !original) return fallback
		return handleReplay(original, fallback)
	}

	return {
		async onRequest({ request, id }) {
			const clone = safeClone(request)
			if (clone) requestClones.set(id, clone)
			if (!shouldAttachToken(request)) return undefined
			return attachToken(request)
		},

		async onResponse({ request, response, id }) {
			const original = requestClones.get(id)
			requestClones.delete(id)
			if (response.status !== 401 || !shouldAttachToken(request)) {
				return undefined
			}
			return handleUnauthorized(original, response)
		},
	}
}
