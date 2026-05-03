import fastify, { type FastifyInstance, type FastifyRequest } from "fastify"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

const MEMBER_GENERAL_LIMIT = 5
const MEMBER_AUTH_LIMIT = 2
const ADMIN_MULTIPLIER = 3
const TIME_WINDOW = 60_000

function simulateAuth(req: FastifyRequest): void {
	const userId = req.headers["x-test-user-id"] as string | undefined
	const role = (req.headers["x-test-user-role"] as string) || "MEMBER"
	if (userId) {
		;(req as any).user = {
			sub: { id: userId, email: `${userId}@test.com`, role, jwi: "test-jwi" },
			iat: Date.now(),
			exp: Date.now() + 3600,
		}
	}
}

function keyGenerator(req: FastifyRequest): string {
	try {
		if ((req as any).user?.sub?.id) {
			return (req as any).user.sub.id
		}
	} catch {}
	return req.ip
}

function resolveLimit(req: FastifyRequest, baseLimit: number): number {
	try {
		if ((req as any).user?.sub?.role === "ADMIN") {
			return baseLimit * ADMIN_MULTIPLIER
		}
	} catch {}
	return baseLimit
}

function maxFunction(req: FastifyRequest): number {
	return resolveLimit(req, MEMBER_GENERAL_LIMIT)
}

describe("Rate Limiting Integration", () => {
	let app: FastifyInstance

	beforeEach(async () => {
		app = fastify()

		app.addHook("onRequest", async (req) => {
			simulateAuth(req)
		})

		const { default: fastifyRateLimit } = await import("@fastify/rate-limit")

		await app.register(fastifyRateLimit, {
			global: true,
			max: maxFunction,
			timeWindow: TIME_WINDOW,
			hook: "preHandler",
			keyGenerator,
			skipOnError: true,
		})

		app.get("/test", async () => ({ status: "ok" }))

		app.post(
			"/sessions",
			{
				config: {
					rateLimit: {
						max: (req: FastifyRequest): number =>
							resolveLimit(req, MEMBER_AUTH_LIMIT),
						timeWindow: TIME_WINDOW,
					},
				},
			},
			async () => ({ token: "test" }),
		)

		app.get("/health-check", { config: { rateLimit: false } }, async () => ({
			status: "healthy",
		}))

		await app.ready()
	})

	afterEach(async () => {
		await app.close()
	})

	test("should include rate limit headers in successful response", async () => {
		const response = await request(app.server).get("/test")
		expect(response.status).toBe(200)
		expect(response.headers["x-ratelimit-limit"]).toBeDefined()
		expect(response.headers["x-ratelimit-remaining"]).toBeDefined()
		expect(response.headers["x-ratelimit-reset"]).toBeDefined()
	})

	test("should return 429 when rate limit is exceeded", async () => {
		for (let i = 0; i < MEMBER_GENERAL_LIMIT; i++) {
			const res = await request(app.server).get("/test")
			expect(res.status).toBe(200)
		}
		const blockedResponse = await request(app.server).get("/test")
		expect(blockedResponse.status).toBe(429)
		expect(blockedResponse.headers["retry-after"]).toBeDefined()
	})

	test("auth route should block with lower limit than general route", async () => {
		for (let i = 0; i < MEMBER_AUTH_LIMIT; i++) {
			const res = await request(app.server).post("/sessions")
			expect(res.status).toBe(200)
		}
		const authBlocked = await request(app.server).post("/sessions")
		expect(authBlocked.status).toBe(429)

		const generalRes = await request(app.server).get("/test")
		expect(generalRes.status).toBe(200)
	})

	test("excluded route should never return 429", async () => {
		const totalRequests = MEMBER_GENERAL_LIMIT + 5
		for (let i = 0; i < totalRequests; i++) {
			const res = await request(app.server).get("/health-check")
			expect(res.status).toBe(200)
		}
	})

	test("authenticated user uses userId as key, not IP", async () => {
		for (let i = 0; i < MEMBER_GENERAL_LIMIT; i++) {
			await request(app.server).get("/test").set("x-test-user-id", "user-a")
		}
		const blockedA = await request(app.server)
			.get("/test")
			.set("x-test-user-id", "user-a")
		expect(blockedA.status).toBe(429)

		const responseB = await request(app.server)
			.get("/test")
			.set("x-test-user-id", "user-b")
		expect(responseB.status).toBe(200)
	})

	test("admin should have 3x the rate limit of member", async () => {
		const adminLimit = MEMBER_GENERAL_LIMIT * ADMIN_MULTIPLIER

		for (let i = 0; i < adminLimit; i++) {
			const res = await request(app.server)
				.get("/test")
				.set("x-test-user-id", "admin-1")
				.set("x-test-user-role", "ADMIN")
			expect(res.status).toBe(200)
		}

		const blocked = await request(app.server)
			.get("/test")
			.set("x-test-user-id", "admin-1")
			.set("x-test-user-role", "ADMIN")
		expect(blocked.status).toBe(429)
	})
})
