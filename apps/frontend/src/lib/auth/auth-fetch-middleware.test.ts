import { HttpResponse, http } from "msw"
import createClient from "openapi-fetch"
import { afterEach, describe, expect, it, vi } from "vitest"
import { server } from "@/test/msw/server"
import { createAuthFetchMiddleware } from "./auth-fetch-middleware"
import { useAuthStore } from "./auth-store"
import { TokenRefreshScheduler } from "./token-refresh"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

interface MeResponse {
	id: string
	name: string
}

function makeJwt(payload: Record<string, unknown>): string {
	const part = (obj: unknown) =>
		Buffer.from(JSON.stringify(obj))
			.toString("base64")
			.replace(/=+$/, "")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
	return `${part({ alg: "HS256" })}.${part(payload)}.sig`
}

function buildClient(scheduler: TokenRefreshScheduler) {
	const client = createClient({ baseUrl: apiBaseUrl })
	client.use(createAuthFetchMiddleware({ scheduler }))
	return client
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe("createAuthFetchMiddleware", () => {
	it("injects Authorization header on protected requests", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let received: string | null = null
		server.use(
			http.get(`${apiBaseUrl}/users/me`, ({ request }) => {
				received = request.headers.get("authorization")
				return HttpResponse.json({ id: "u", name: "Authed" })
			}),
		)
		const scheduler = new TokenRefreshScheduler({
			refreshFn: async () => ({ accessToken: "noop" }),
		})
		const client = buildClient(scheduler)

		const { data } = (await (
			client as unknown as {
				GET: (path: string) => Promise<{ data?: MeResponse }>
			}
		).GET("/users/me")) as { data?: MeResponse }

		expect(received).toMatch(/^Bearer /)
		expect(data?.name).toBe("Authed")
		scheduler.stop()
	})

	it("does not attach Authorization to /sessions login", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let header: string | null = "set"
		server.use(
			http.post(`${apiBaseUrl}/sessions`, ({ request }) => {
				header = request.headers.get("authorization")
				return HttpResponse.json({ token: "t" })
			}),
		)
		const scheduler = new TokenRefreshScheduler({
			refreshFn: async () => ({ accessToken: "noop" }),
		})
		const client = buildClient(scheduler)

		await (
			client as unknown as {
				POST: (path: string, init: { body: unknown }) => Promise<unknown>
			}
		).POST("/sessions", { body: { email: "a@b.c", password: "secret123" } })

		expect(header).toBeNull()
		scheduler.stop()
	})

	it("on 401 refreshes token and replays the original request", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let attempts = 0
		server.use(
			http.get(`${apiBaseUrl}/users/me`, ({ request }) => {
				attempts += 1
				if (attempts === 1) {
					return new HttpResponse(JSON.stringify({ message: "expired" }), {
						status: 401,
					})
				}
				return HttpResponse.json({
					id: "u",
					name: request.headers.get("authorization") ?? "no",
				})
			}),
		)
		const newToken = makeJwt({
			sub: "u",
			role: "MEMBER",
			exp: Math.floor((Date.now() + 600_000) / 1000),
		})
		const refreshFn = vi.fn(async () => ({ accessToken: newToken }))
		const scheduler = new TokenRefreshScheduler({ refreshFn })
		const client = buildClient(scheduler)

		const { data } = (await (
			client as unknown as {
				GET: (path: string) => Promise<{ data?: MeResponse }>
			}
		).GET("/users/me")) as { data?: MeResponse }

		expect(refreshFn).toHaveBeenCalledTimes(1)
		expect(attempts).toBe(2)
		expect(data?.name).toContain(`Bearer ${newToken}`)
		scheduler.stop()
	})

	it("attaches Authorization header on GET /users (protected admin route)", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "ADMIN",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let received: string | null = null
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				received = request.headers.get("authorization")
				return HttpResponse.json({
					users: [],
					pagination: { total: 0, page: 1, limit: 10 },
				})
			}),
		)
		const scheduler = new TokenRefreshScheduler({
			refreshFn: async () => ({ accessToken: "noop" }),
		})
		const client = buildClient(scheduler)

		await (
			client as unknown as {
				GET: (
					path: string,
					init: { params: unknown },
				) => Promise<{ data?: unknown }>
			}
		).GET("/users", { params: { query: { page: 1, limit: 10 } } })

		expect(received).toMatch(/^Bearer /)
		scheduler.stop()
	})

	it("does not attach Authorization to POST /users (public signup)", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let header: string | null = "set"
		server.use(
			http.post(`${apiBaseUrl}/users`, ({ request }) => {
				header = request.headers.get("authorization")
				return HttpResponse.json({ email: "new@example.com" })
			}),
		)
		const scheduler = new TokenRefreshScheduler({
			refreshFn: async () => ({ accessToken: "noop" }),
		})
		const client = buildClient(scheduler)

		await (
			client as unknown as {
				POST: (path: string, init: { body: unknown }) => Promise<unknown>
			}
		).POST("/users", {
			body: { name: "Test", email: "new@example.com", password: "secret123" },
		})

		expect(header).toBeNull()
		scheduler.stop()
	})

	it("attempts refresh on GET /users 401 (protected route)", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "ADMIN",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		let attempts = 0
		server.use(
			http.get(`${apiBaseUrl}/users`, () => {
				attempts += 1
				if (attempts === 1) {
					return new HttpResponse(JSON.stringify({ message: "expired" }), {
						status: 401,
					})
				}
				return HttpResponse.json({
					users: [],
					pagination: { total: 0, page: 1, limit: 10 },
				})
			}),
		)
		const newToken = makeJwt({
			sub: "u",
			role: "ADMIN",
			exp: Math.floor((Date.now() + 600_000) / 1000),
		})
		const refreshFn = vi.fn(async () => ({ accessToken: newToken }))
		const scheduler = new TokenRefreshScheduler({ refreshFn })
		const client = buildClient(scheduler)

		await (
			client as unknown as {
				GET: (
					path: string,
					init: { params: unknown },
				) => Promise<{ data?: unknown }>
			}
		).GET("/users", { params: { query: { page: 1, limit: 10 } } })

		expect(refreshFn).toHaveBeenCalledTimes(1)
		expect(attempts).toBe(2)
		scheduler.stop()
	})

	it("on definitive 401 clears auth store and calls onForcedLogout", async () => {
		useAuthStore.getState().setSession(
			makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 60_000) / 1000),
			}),
		)
		server.use(
			http.get(
				`${apiBaseUrl}/users/me`,
				() => new HttpResponse(null, { status: 401 }),
			),
		)
		const refreshFn = vi.fn(async () => {
			throw new Error("refresh denied")
		})
		const onForcedLogout = vi.fn()
		const scheduler = new TokenRefreshScheduler({
			refreshFn,
			onForcedLogout,
		})
		const client = createClient({ baseUrl: apiBaseUrl })
		client.use(createAuthFetchMiddleware({ scheduler, onForcedLogout }))

		const { response } = (await (
			client as unknown as {
				GET: (path: string) => Promise<{ response: Response }>
			}
		).GET("/users/me")) as { response: Response }

		expect(response.status).toBe(401)
		expect(useAuthStore.getState().accessToken).toBeNull()
		expect(onForcedLogout).toHaveBeenCalled()
		scheduler.stop()
	})
})
