import { describe, expect, test, vi } from "vitest"
import { RATE_LIMIT_CONFIG } from "./rate-limit-config.js"
import { RateLimitPlugin } from "./rate-limit-plugin.js"

function createMockRequest(overrides: Record<string, any> = {}) {
	return {
		ip: "127.0.0.1",
		url: "/test",
		method: "GET",
		...overrides,
	} as any
}

function createMockLogger() {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

function createMockQueue() {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn().mockResolvedValue(undefined),
		consume: vi.fn().mockResolvedValue(undefined),
	}
}

describe("RateLimitPlugin", () => {
	describe("keyGenerator", () => {
		const keyGenerator = RateLimitPlugin.createKeyGenerator()

		test("returns IP when no authenticated user", () => {
			const request = createMockRequest()
			expect(keyGenerator(request)).toBe("127.0.0.1")
		})

		test("returns userId when user is authenticated", () => {
			const request = createMockRequest({
				user: {
					sub: {
						id: "user-123",
						role: "MEMBER",
						email: "test@test.com",
						jwi: "jwi",
					},
				},
			})
			expect(keyGenerator(request)).toBe("user-123")
		})
	})

	describe("max function", () => {
		const maxFn = RateLimitPlugin.createMaxFunction()

		test("returns MEMBER limit for regular users", () => {
			const request = createMockRequest({
				user: { sub: { id: "user-1", role: "MEMBER" } },
			})
			expect(maxFn(request, "key")).toBe(RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER)
		})

		test("returns ADMIN limit for admin users (3x)", () => {
			const request = createMockRequest({
				user: { sub: { id: "admin-1", role: "ADMIN" } },
			})
			expect(maxFn(request, "key")).toBe(RATE_LIMIT_CONFIG.GENERAL.MAX_ADMIN)
		})

		test("returns MEMBER limit when user is not authenticated", () => {
			const request = createMockRequest()
			expect(maxFn(request, "key")).toBe(RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER)
		})
	})

	describe("onExceeded callback", () => {
		test("calls Logger.warn with structured payload", () => {
			const logger = createMockLogger()
			const queue = createMockQueue()
			const onExceeded = RateLimitPlugin.createOnExceededCallback(logger, queue)
			const request = createMockRequest({
				user: { sub: { id: "user-1", role: "MEMBER" } },
				url: "/sessions",
				method: "POST",
			})

			onExceeded(request, "key")

			expect(logger.warn).toHaveBeenCalledWith(
				RateLimitPlugin,
				expect.objectContaining({
					ip: "127.0.0.1",
					route: "/sessions",
					method: "POST",
					userId: "user-1",
					role: "MEMBER",
					timestamp: expect.any(String),
				}),
			)
		})

		test("calls Queue.publish with exchange and payload", () => {
			const logger = createMockLogger()
			const queue = createMockQueue()
			const onExceeded = RateLimitPlugin.createOnExceededCallback(logger, queue)
			const request = createMockRequest()

			onExceeded(request, "key")

			expect(queue.publish).toHaveBeenCalledWith(
				"rateLimitExceeded",
				expect.objectContaining({
					ip: "127.0.0.1",
					timestamp: expect.any(String),
				}),
			)
		})

		test("does not propagate error if Queue.publish rejects", () => {
			const logger = createMockLogger()
			const queue = createMockQueue()
			queue.publish.mockRejectedValue(new Error("RabbitMQ down"))
			const onExceeded = RateLimitPlugin.createOnExceededCallback(logger, queue)
			const request = createMockRequest()

			expect(() => onExceeded(request, "key")).not.toThrow()
		})
	})
})
